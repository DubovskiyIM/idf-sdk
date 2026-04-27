/**
 * createValidator — pure factory поверх Persistence interface.
 *
 * Реализует §10 манифеста: fold(Φ_confirmed) как source of truth.
 * В отличие от host-validator, invariant-check выполняется ДО appendEffect
 * (simulate → check → append), что исключает необходимость rollback.
 *
 * @module validator
 */

import {
  causalSort,
  buildTypeMap,
  checkInvariants,
  hashOntology,
  tagWithSchemaVersion,
} from "@intent-driven/core";

/**
 * @param {Object} opts
 * @param {import('./persistence/types.js').Persistence} opts.persistence
 * @param {Object} opts.ontology — domain.ONTOLOGY с entities + roles + invariants
 * @param {(intentId: string, ctx: Object, world: Object) => { ok: boolean, reason?: string }} [opts.validateIntentConditions]
 *   Domain-specific conditions check. По умолчанию всегда ok.
 * @param {() => number} [opts.clock] — Injected clock для resolved_at. По умолчанию Date.now.
 * @returns {{
 *   submit: (effect: Object, opts?: { viewer?: Object }) => Promise<{ status: "confirmed"|"rejected", reason?: string, cascaded?: string[] }>,
 *   foldWorld: () => Promise<Object>,
 *   cascadeReject: (parentId: string, reason: string) => Promise<string[]>
 * }}
 */
export function createValidator({
  persistence,
  ontology,
  validateIntentConditions = () => ({ ok: true }),
  clock = () => Date.now(),
}) {
  const typeMap = buildTypeMap(ontology);
  // Φ schema-versioning Phase 1: ontology hash зафиксирован на старте engine'а;
  // каждый submit-эффект получает этот тег в context.schemaVersion перед
  // appendEffect, чтобы fold(upcast(Φ)) в Phase 3 знал, под какой онтологией
  // эффект был эмиттен. Backlog §2.8.
  const schemaVersion = hashOntology(ontology);

  /**
   * Тегировать эффект schemaVersion'ом ДО appendEffect.
   *
   * Особенности:
   *   - context может быть string (host сериализует JSON для PG JSONB).
   *     Тогда — parse → tag → re-stringify.
   *   - α === "batch": теги проставляются и parent'у, и всем sub-эффектам
   *     в value[] (они confirmed под той же онтологией).
   *
   * @param {Object} effect
   * @returns {Object} новая копия (pure)
   */
  function applySchemaVersionTag(effect) {
    let tagged;
    if (typeof effect.context === "string") {
      let parsed;
      try {
        parsed = JSON.parse(effect.context);
      } catch {
        // Невалидный JSON — оставляем context как есть, но рядом сохраняем
        // тег через свежий object-context. Edge case; не должен случаться
        // в нормальном flow.
        return { ...effect, _schemaVersion: schemaVersion };
      }
      const taggedObj = tagWithSchemaVersion({ ...effect, context: parsed }, schemaVersion);
      tagged = { ...taggedObj, context: JSON.stringify(taggedObj.context) };
    } else {
      tagged = tagWithSchemaVersion(effect, schemaVersion);
    }

    if (tagged.alpha === "batch" && Array.isArray(tagged.value)) {
      tagged = { ...tagged, value: tagged.value.map(applySchemaVersionTag) };
    }
    return tagged;
  }

  /**
   * Определяет имя коллекции для entity target.
   * Lookup регистронезависимый — по образцу SINGULAR_TO_PLURAL в host.
   */
  function getCollectionType(target) {
    const base = target.split(".")[0];
    return typeMap[base.toLowerCase()] || base.charAt(0).toLowerCase() + base.slice(1);
  }

  /**
   * Свёртка confirmed эффектов в world-объект.
   *
   * Семантика α-операторов идентична host-validator:
   * - add: upsert по ctx.id || ef.id
   * - replace: мерж ctx (без id) поверх existing, либо field-update если target вида «Entity.field»
   * - remove: удаление по ctx.id
   * - batch: рекурсивная обработка под-эффектов из ef.value[]
   *
   * Эффекты с target «drafts» и scope «presentation» пропускаются (§10).
   */
  async function foldWorld() {
    const raw = await persistence.readEffects({ status: "confirmed" });
    const effects = causalSort(raw);
    const collections = {};

    function applyEf(ef, ctx, val) {
      if (ef.target.startsWith("drafts")) return;
      if (ef.scope === "presentation") return;

      if (ef.alpha === "batch") {
        const batchItems = val || [];
        for (const sub of batchItems) {
          const subCtx = sub.context || {};
          const subVal = sub.value != null ? sub.value : null;
          applyEf(sub, subCtx, subVal);
        }
        return;
      }

      const collType = getCollectionType(ef.target);
      if (!collections[collType]) collections[collType] = {};

      switch (ef.alpha) {
        case "add": {
          const entityId = ctx.id || ef.id;
          collections[collType][entityId] = { ...ctx };
          break;
        }
        case "replace": {
          const entityId = ctx.id;
          if (entityId && collections[collType][entityId]) {
            const segments = ef.target.split(".");
            if (segments.length > 1) {
              // Target вида «Entity.field» — обновляем конкретное поле через val
              const field = segments[segments.length - 1];
              collections[collType][entityId] = {
                ...collections[collType][entityId],
                [field]: val,
              };
            } else {
              // Target вида «Entity» — мерж ctx без id поверх записи
              const { id: _id, ...patch } = ctx;
              collections[collType][entityId] = {
                ...collections[collType][entityId],
                ...patch,
              };
            }
          }
          break;
        }
        case "remove": {
          const entityId = ctx.id;
          if (entityId) delete collections[collType][entityId];
          break;
        }
      }
    }

    for (const ef of effects) {
      // Persistence возвращает уже десериализованные объекты.
      // context и value могут быть строками (raw sqlite) или объектами (inMemory).
      // Пустая строка — валидное JS-значение, но невалидный JSON: `JSON.parse("")` бросает.
      // Трактуем пустую строку и null одинаково как «нет значения».
      const ctx = typeof ef.context === "string" && ef.context !== ""
        ? JSON.parse(ef.context)
        : (typeof ef.context === "object" && ef.context != null ? ef.context : {});
      const val = typeof ef.value === "string" && ef.value !== ""
        ? JSON.parse(ef.value)
        : (ef.value != null ? ef.value : null);
      applyEf(ef, ctx, val);
    }

    const world = {};
    for (const [type, entities] of Object.entries(collections)) {
      world[type] = Object.values(entities);
    }
    return world;
  }

  /**
   * Итеративный cascade-reject — помечает все дочерние эффекты rejected.
   * Использует visited Set для защиты от циклов в parent_id-графе.
   *
   * @param {string} parentId — ID эффекта, от которого каскадируем
   * @param {string} reason — причина для записи в meta
   * @returns {Promise<string[]>} — IDs всех отвергнутых дочерних эффектов
   */
  async function cascadeReject(parentId, reason) {
    const all = await persistence.readEffects();
    const cascaded = [];
    const visited = new Set();

    function collect(id) {
      if (visited.has(id)) return;
      visited.add(id);
      for (const e of all) {
        if (e.parent_id === id && e.status !== "rejected") {
          cascaded.push(e.id);
          collect(e.id);
        }
      }
    }

    collect(parentId);

    for (const id of cascaded) {
      await persistence.updateStatus(id, "rejected", {
        reason: `cascade: ${reason}`,
        resolvedAt: clock(),
      });
    }

    return cascaded;
  }

  /**
   * Имитировать применение одного эффекта поверх текущего world.
   * Используется для проверки invariants ДО appendEffect (без rollback).
   * batch-эффекты не simulate'ируются целиком — их под-эффекты валидируются
   * индивидуально на уровне orchestrator'а выше.
   */
  async function simulateApply(currentWorld, effect) {
    const sim = JSON.parse(JSON.stringify(currentWorld));
    const ctx = typeof effect.context === "string"
      ? JSON.parse(effect.context)
      : (effect.context || {});
    const collType = getCollectionType(effect.target);
    if (!sim[collType]) sim[collType] = [];

    switch (effect.alpha) {
      case "add": {
        sim[collType].push({ ...ctx });
        break;
      }
      case "replace": {
        const entityId = ctx.id;
        const idx = sim[collType].findIndex((e) => e.id === entityId);
        if (idx >= 0) {
          const segments = effect.target.split(".");
          if (segments.length > 1) {
            const field = segments[segments.length - 1];
            const val = typeof effect.value === "string"
              ? JSON.parse(effect.value)
              : effect.value;
            sim[collType][idx] = { ...sim[collType][idx], [field]: val };
          } else {
            const { id: _id, ...patch } = ctx;
            sim[collType][idx] = { ...sim[collType][idx], ...patch };
          }
        }
        break;
      }
      case "remove": {
        const entityId = ctx.id;
        sim[collType] = sim[collType].filter((e) => e.id !== entityId);
        break;
      }
      // batch: не simulate'ируем агрегат целиком (см. JSDoc выше)
    }

    return sim;
  }

  /**
   * Применить эффект к Φ: proposed → validated → confirmed|rejected.
   *
   * Lifecycle:
   *   1. Нормализуем статус → proposed, записываем в Φ через appendEffect.
   *   2. Per-effect runtime guards (intent conditions / irreversibility /
   *      existence / invariants).
   *   3. updateStatus → confirmed или rejected + cascadeReject при отказе.
   *
   * Per-effect порядок проверок:
   *   1. Domain-specific intent conditions
   *   2. Irreversibility guard — α:"remove" заблокирован при past-high-irr
   *   3. Existence check для replace/remove
   *   4. Global invariants через simulateApply
   *
   * checkAnchoring / checkIntegrity — design-time catalogue-level проверки,
   * они вызываются один раз при engine init'е, не здесь.
   *
   * @param {Object} effect — Effect-объект (context/value уже могут быть объектами)
   * @param {{ viewer?: Object }} [opts]
   * @returns {Promise<{ status: "confirmed"|"rejected", reason?: string, cascaded?: string[] }>}
   */
  async function submit(effect, { viewer } = {}) {
    // Normalize status → proposed (caller мог передать что угодно).
    // Φ schema-versioning: тегируем context.schemaVersion ДО persist,
    // чтобы хэш онтологии был частью audit trail (backlog §2.8, Phase 1).
    const normalized = applySchemaVersionTag({ ...effect, status: "proposed" });
    await persistence.appendEffect(normalized);

    const world = await foldWorld();
    const ctx = typeof effect.context === "string"
      ? JSON.parse(effect.context)
      : (effect.context || {});
    const now = clock();

    async function reject(reason) {
      await persistence.updateStatus(effect.id, "rejected", { reason, resolvedAt: now });
      const cascaded = await cascadeReject(effect.id, reason);
      return { status: "rejected", reason, cascaded };
    }

    // 1. Domain-specific intent conditions
    const cond = validateIntentConditions(effect.intent_id, ctx, world);
    if (!cond.ok) {
      return await reject(cond.reason || "intent-condition-failed");
    }

    // 2. Irreversibility guard — α:"remove" заблокирован если в истории сущности
    // есть confirmed effect с __irr.point === "high" && __irr.at !== null.
    // Forward-correction через α:"replace" разрешён всегда (§23 манифеста).
    if (effect.alpha === "remove" && ctx.id && !effect.target.startsWith("drafts")) {
      const pastEffects = await persistence.readEffects({ status: "confirmed" });
      const hasIrreversiblePast = pastEffects.some((e) => {
        const eCtx = typeof e.context === "string" ? JSON.parse(e.context) : (e.context || {});
        return (
          eCtx.id === ctx.id &&
          eCtx.__irr?.point === "high" &&
          eCtx.__irr?.at != null
        );
      });
      if (hasIrreversiblePast) {
        return await reject(`irreversibility: сущность ${ctx.id} имеет эффект в истории с __irr.point=high`);
      }
    }

    // 3. Existence check для replace/remove.
    // Системные intent'ы scheduler'а пропускаем (schedule_timer/revoke_timer).
    if (
      (effect.alpha === "replace" || effect.alpha === "remove") &&
      ctx.id &&
      !effect.target.startsWith("drafts") &&
      effect.intent_id !== "schedule_timer" &&
      effect.intent_id !== "revoke_timer"
    ) {
      const collType = getCollectionType(effect.target);
      const exists = (world[collType] || []).some((e) => e.id === ctx.id);
      if (!exists) {
        return await reject(`entity-not-found: ${ctx.id} в коллекции ${collType}`);
      }
    }

    // 4. Global invariants (simulate → check)
    // checkInvariants из core возвращает { ok, violations } — деструктурируем.
    const simulatedWorld = await simulateApply(world, effect);
    const result = checkInvariants(simulatedWorld, ontology, { viewer });
    const violations = Array.isArray(result) ? result : (result?.violations || []);
    const errors = violations.filter((v) => v.severity === "error");
    if (errors.length > 0) {
      const reason = errors.map((v) => `${v.kind}: ${v.message}`).join("; ");
      return await reject(`invariant: ${reason}`);
    }

    // 5. Всё прошло — фиксируем в Φ
    await persistence.updateStatus(effect.id, "confirmed", { resolvedAt: now });
    return { status: "confirmed" };
  }

  return { submit, foldWorld, cascadeReject, schemaVersion };
}
