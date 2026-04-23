/**
 * lifecycle-gated-destructive — destructive intent блокируется до парного disable.
 *
 * Сущность с lifecycle-флагом (inUse=true / status=active / published) требует
 * two-phase delete: сначала deactivate через парный replace-intent, потом уже
 * remove. UI должен отдавать remove-action как grayed-out с tooltip «disable
 * first», пока lifecycle-флаг не переведён в неактивное состояние.
 *
 * Сигнал: Apache Gravitino (metalake/catalog — disable → delete),
 * Stripe products (archive → delete), IDF sales (suspend_listing → remove_listing).
 */

const INACTIVE_STATUS_RE = /^(disabled|inactive|archived|suspended|closed|paused|not_in_use|notinuse|draft|retired)$/i;
const ACTIVE_STATUS_RE = /^(active|published|enabled|in_use|inuse|running|open|live)$/i;

function findDisableIntent(intents, mainEntity, statusField) {
  const mainLower = mainEntity.toLowerCase();
  const targetLower = `${mainLower}.${statusField.toLowerCase()}`;
  for (const intent of intents || []) {
    const effects = intent.particles?.effects || [];
    for (const ef of effects) {
      if (ef.α !== "replace") continue;
      if (typeof ef.target !== "string") continue;
      if (ef.target.toLowerCase() !== targetLower) continue;
      // value может быть string ("disabled") или ссылкой на параметр — берём то, что
      // хотя бы похоже на inactive-state. Точное значение читается отдельно.
      return intent;
    }
  }
  return null;
}

function findRemoveIntent(intents, mainEntity) {
  const mainLower = mainEntity.toLowerCase();
  for (const intent of intents || []) {
    const effects = intent.particles?.effects || [];
    for (const ef of effects) {
      if (ef.α !== "remove") continue;
      const target = typeof ef.target === "string" ? ef.target.toLowerCase() : "";
      // α:remove на entities с entity matching mainEntity — стандартная форма
      if (target === "entities" || target === `entities.${mainLower}` || target === mainLower) {
        return intent;
      }
    }
  }
  return null;
}

function detectStatusField(entity) {
  // Явный status-enum
  const fields = entity?.fields || {};
  if (fields.status?.options?.length >= 2) return "status";
  // Boolean-lifecycle (inUse / enabled / published) — тоже считаем
  for (const [name, def] of Object.entries(fields)) {
    if (def?.type !== "boolean") continue;
    if (/^(inUse|enabled|published|active|isActive)$/.test(name)) return name;
  }
  // entity.statuses с ≥2 значениями — legacy форма
  if (Array.isArray(entity?.statuses) && entity.statuses.length >= 2) return "status";
  return null;
}

function extractDisableTargetValue(disableIntent, mainEntity, statusField) {
  const targetLower = `${mainEntity.toLowerCase()}.${statusField.toLowerCase()}`;
  const effects = disableIntent?.particles?.effects || [];
  for (const ef of effects) {
    if (ef.α !== "replace") continue;
    if (typeof ef.target !== "string") continue;
    if (ef.target.toLowerCase() !== targetLower) continue;
    if (Object.prototype.hasOwnProperty.call(ef, "value")) return ef.value;
  }
  return undefined;
}

function detectInactiveValue(entity, statusField, disableIntent, mainEntity) {
  const fields = entity?.fields || {};
  const def = fields[statusField] || {};
  // Приоритет: точное value из disable-intent (если автор указал)
  const explicit = extractDisableTargetValue(disableIntent, mainEntity, statusField);
  if (explicit !== undefined) return explicit;
  if (def.type === "boolean") return false;
  const options = def.options || entity.statuses || [];
  // Regex-fallback: ищем inactive-подобный, избегая active-совпадений
  const inactive = options.find(s =>
    INACTIVE_STATUS_RE.test(String(s)) && !ACTIVE_STATUS_RE.test(String(s)),
  );
  return inactive || null;
}

function detectActiveValue(entity, statusField) {
  const fields = entity?.fields || {};
  const def = fields[statusField] || {};
  if (def.type === "boolean") return true;
  const options = def.options || entity.statuses || [];
  const active = options.find(s => ACTIVE_STATUS_RE.test(String(s)));
  return active || null;
}

export default {
  id: "lifecycle-gated-destructive",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "intent-effect", α: "remove" },
    ],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return false;

      const statusField = detectStatusField(entity);
      if (!statusField) return false;

      const disable = findDisableIntent(intents || [], mainEntity, statusField);
      if (!disable) return false;

      const remove = findRemoveIntent(intents || [], mainEntity);
      if (!remove) return false;

      // Проверяем что inactive и active существуют и действительно различаются
      // (disable-intent не должен вести в active-состояние).
      const inactive = detectInactiveValue(entity, statusField, disable, mainEntity);
      const active = detectActiveValue(entity, statusField);
      if (inactive === null || inactive === undefined || active === null) return false;
      if (inactive === active) return false;
      if (typeof inactive === "string" && ACTIVE_STATUS_RE.test(inactive)) return false;
      return true;
    },
  },
  structure: {
    slot: "actionGates",
    description:
      "Destructive intent (α:remove) на detail получает блокировку: пока lifecycle-поле " +
      "(status=active, inUse=true) не переведено в неактивное состояние через парный " +
      "disable-intent, remove рендерится как disabled с tooltip. После disable — gate снимается.",
    /**
     * Apply: для mainEntity с lifecycle-флагом и парой (disable, remove)
     * добавляет в `slots.actionGates` запись, блокирующую remove-intent до
     * срабатывания disable-intent. Renderer читает gate и рендерит action
     * как disabled с tooltip, пока item.<statusField> !== <inactiveValue>.
     *
     * Idempotent: существующий gate с тем же id не перезаписывается.
     */
    apply(slots, context) {
      const { ontology, mainEntity, intents } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;
      const entity = ontology.entities[mainEntity];
      if (!entity) return slots;

      const statusField = detectStatusField(entity);
      if (!statusField) return slots;

      const disable = findDisableIntent(intents || [], mainEntity, statusField);
      const remove = findRemoveIntent(intents || [], mainEntity);
      if (!disable || !remove) return slots;

      const inactive = detectInactiveValue(entity, statusField, disable, mainEntity);
      const active = detectActiveValue(entity, statusField);
      if (inactive === null || active === null) return slots;

      const gateId = `lifecycleGated_${remove.id}`;
      const existing = slots?.actionGates || [];
      if (existing.some(g => g?.id === gateId)) return slots;

      const inactiveLiteral = typeof inactive === "string"
        ? `'${inactive}'`
        : String(inactive);
      const gate = {
        id: gateId,
        intentId: remove.id,
        blockedWhen: `item.${statusField} !== ${inactiveLiteral}`,
        enabledBy: disable.id,
        tooltip: "Сначала переведите в неактивное состояние",
        statusField,
        inactiveValue: inactive,
        activeValue: active,
        source: "derived:lifecycle-gated-destructive",
      };

      return {
        ...slots,
        actionGates: [...existing, gate],
      };
    },
  },
  rationale: {
    hypothesis:
      "Two-phase delete превращает irreversible drop в reversible deactivate + drop. " +
      "Пользователь получает окно отката после disable без потери данных, а пропущенный " +
      "disable-step служит явным сигналом «этот объект исчезает». Без gate — один " +
      "неудачный клик и рестор невозможен.",
    evidence: [
      { source: "gravitino-webui", description: "Metalake/Catalog: Delete grayed пока «not in-use» не выставлен", reliability: "high" },
      { source: "stripe-products", description: "Product archive → delete: нельзя удалить активный продукт", reliability: "high" },
      { source: "idf-sales", description: "suspend_listing → remove_listing: active listing защищён от удаления", reliability: "high" },
    ],
    counterexample: [
      { source: "drafts", description: "Draft без lifecycle → delete сразу, без gate", reliability: "high" },
      { source: "ephemeral-session", description: "Session/token — revoke = remove, нет intermediate state", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_detail", reason: "suspend_listing → remove_listing через status" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "my_polls", reason: "Poll удаляется напрямую, нет disable-фазы" },
      { domain: "messenger", projection: "conversation_detail", reason: "Conversation не имеет lifecycle + remove пары" },
    ],
  },
};
