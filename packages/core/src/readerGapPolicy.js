/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('../types/idf.d.ts').World} World */

/**
 * Φ schema-versioning — Phase 4: Reader gap policy.
 *
 * Контракт зафиксирован в design-spec
 * `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md` §4.5.
 * Backlog item: idf/docs/backlog.md §2.8.
 *
 * Reader-equivalence (§23 axiom 5) обновляется: «equivalent information
 * content **under the same gap policy**». Это аксиома формата — все 4 reader'а
 * должны давать одинаковый набор «здесь была информация / здесь её не было /
 * здесь она stale» под одной policy.
 *
 * Три типа gap'а:
 *   - missingField    — поле отсутствует (legacy effect, эмитированный до того,
 *                       как поле было добавлено в онтологию)
 *   - unknownEnumValue — значение не входит в текущий enum (упразднено или
 *                       переименовано без upcaster'а)
 *   - removedEntityRef — ref-поле указывает на сущность, которой нет в world
 *                       (entity была удалена, или эффект её add не приехал)
 *
 * Стратегии разрешения (action verbs, не reader-specific):
 *   - "hidden"        — скрыть в UI, но отметить в a11y / debug (visual gap-marker)
 *   - "omit"          — не упоминать вовсе (aggressive — для voice / brevity)
 *   - "placeholder"   — показать «—» / «(удалено)»
 *   - "passthrough"   — показать original value as-is (raw)
 *   - "broken-link"   — для refs: показать с отметкой broken
 *   - "error"         — surface как ошибку (for strict mode)
 *
 * Reader → policy дефолты (per spec §4.5):
 *   pixels:   { missing: hidden,      enum: passthrough, ref: broken-link }
 *   voice:    { missing: omit,        enum: omit,        ref: omit }
 *   agent:    { missing: omit,        enum: passthrough, ref: broken-link }
 *   document: { missing: placeholder, enum: placeholder, ref: broken-link }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {"missingField" | "unknownEnumValue" | "removedEntityRef"} GapKind
 */

/**
 * @typedef {"hidden" | "omit" | "placeholder" | "passthrough" | "broken-link" | "error"} GapAction
 */

/**
 * @typedef {Object} ReaderGapPolicy
 * @property {GapAction} missingField
 * @property {GapAction} unknownEnumValue
 * @property {GapAction} removedEntityRef
 */

/**
 * @typedef {"pixels" | "voice" | "agent" | "document"} ReaderKind
 */

/**
 * @typedef {Object} GapDescriptor
 * @property {GapKind} kind
 * @property {unknown} [value]      — сырое значение, найденное в эффекте
 * @property {string} [field]       — имя поля
 * @property {string} [entity]      — имя сущности
 */

/**
 * @typedef {Object} GapResolution
 * @property {GapAction} action
 * @property {unknown} [value]              — value к показу (для passthrough/broken-link)
 * @property {string} [placeholder]         — текст placeholder (для placeholder)
 * @property {GapDescriptor} gap            — исходный gap (audit / Layer 4 detector)
 */

/**
 * Дефолтные policies на 4 reader'а.
 *
 * @type {Record<ReaderKind, ReaderGapPolicy>}
 */
export const DEFAULT_READER_POLICIES = Object.freeze({
  pixels:   Object.freeze({ missingField: "hidden",      unknownEnumValue: "passthrough", removedEntityRef: "broken-link" }),
  voice:    Object.freeze({ missingField: "omit",        unknownEnumValue: "omit",        removedEntityRef: "omit" }),
  agent:    Object.freeze({ missingField: "omit",        unknownEnumValue: "passthrough", removedEntityRef: "broken-link" }),
  document: Object.freeze({ missingField: "placeholder", unknownEnumValue: "placeholder", removedEntityRef: "broken-link" }),
});

/**
 * Универсальный дефолтный placeholder. Reader'ы могут переопределить через
 * options.placeholder в resolveGap.
 */
export const DEFAULT_PLACEHOLDER = "—";

// ─────────────────────────────────────────────────────────────────────────────
// Policy resolution & override
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Получить policy для reader'а с опциональным override. Override — partial,
 * мерджится поверх дефолта; неуказанные ключи остаются дефолтными.
 *
 * @param {ReaderKind} reader
 * @param {Partial<ReaderGapPolicy>} [override]
 * @returns {ReaderGapPolicy}
 */
export function getReaderPolicy(reader, override) {
  const base = DEFAULT_READER_POLICIES[reader];
  if (!base) {
    throw new Error(`getReaderPolicy: unknown reader "${reader}". Allowed: ${Object.keys(DEFAULT_READER_POLICIES).join(", ")}`);
  }
  if (!override || typeof override !== "object") return { ...base };
  return { ...base, ...override };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Определить gap для значения поля. Возвращает GapDescriptor или null
 * (если значение валидно для текущей онтологии).
 *
 * Логика:
 *   1. value === undefined → missingField
 *   2. fieldDef.type === "enum"|"valueLabels" + value не в valid set → unknownEnumValue
 *   3. fieldDef.type === "ref"|"entityRef" + value (id) не находится в world → removedEntityRef
 *   4. иначе null
 *
 * world нужен только для ref-detection. Если world не передан — ref-checks
 * пропускаются (используется в isolated unit-flows).
 *
 * @param {unknown} value
 * @param {Object} [fieldDef] — fields[name] из ontology
 * @param {{ entity?: string, field?: string, world?: World, typeMap?: Record<string, string> }} [ctx]
 * @returns {GapDescriptor | null}
 */
export function detectFieldGap(value, fieldDef, ctx = {}) {
  if (value === undefined) {
    return { kind: "missingField", field: ctx.field, entity: ctx.entity };
  }
  if (!fieldDef || typeof fieldDef !== "object") return null;

  // Enum-style: type "enum" with `values` или type с `valueLabels` (host-style)
  const enumValues = enumValueSet(fieldDef);
  if (enumValues && typeof value === "string" && !enumValues.has(value)) {
    return { kind: "unknownEnumValue", value, field: ctx.field, entity: ctx.entity };
  }

  // Ref-style: type "ref" / "entityRef" с reference на entity
  const refEntity = referencedEntity(fieldDef);
  if (refEntity && ctx.world) {
    if (!resolveRef(ctx.world, refEntity, value, ctx.typeMap)) {
      return { kind: "removedEntityRef", value, field: ctx.field, entity: ctx.entity };
    }
  }

  return null;
}

/**
 * Извлечь множество допустимых enum-значений из fieldDef. Поддерживает:
 *   - { type: "enum", values: [...] }
 *   - { type: "string", valueLabels: { value → label } }   (host-style)
 *   - { values: [...] }                                     (упрощённая форма)
 *
 * @param {Object} fieldDef
 * @returns {Set<string> | null}
 */
function enumValueSet(fieldDef) {
  if (!fieldDef || typeof fieldDef !== "object") return null;
  if (Array.isArray(fieldDef.values) && fieldDef.values.length > 0) {
    return new Set(fieldDef.values.map(String));
  }
  if (fieldDef.valueLabels && typeof fieldDef.valueLabels === "object") {
    const keys = Object.keys(fieldDef.valueLabels);
    if (keys.length > 0) return new Set(keys);
  }
  return null;
}

/**
 * Имя сущности, на которую ссылается ref-поле. null если поле не ref.
 *
 * @param {Object} fieldDef
 * @returns {string | null}
 */
function referencedEntity(fieldDef) {
  if (!fieldDef || typeof fieldDef !== "object") return null;
  if ((fieldDef.type === "ref" || fieldDef.type === "entityRef") && typeof fieldDef.entity === "string") {
    return fieldDef.entity;
  }
  return null;
}

/**
 * Проверить, что в world есть сущность entity с id === value.
 *
 * @param {World} world
 * @param {string} entityName
 * @param {unknown} id
 * @param {Record<string, string>} [typeMap]
 * @returns {boolean}
 */
function resolveRef(world, entityName, id, typeMap = {}) {
  if (id == null) return false;
  const lower = entityName.toLowerCase();
  // Проверяем варианты: PascalCase ключ (core fold), lowercase (host engine), plural через typeMap
  const candidates = [
    entityName,
    lower,
    typeMap[lower],
    lower + "s",
    lower.endsWith("y") ? lower.slice(0, -1) + "ies" : null,
  ].filter(Boolean);
  for (const key of candidates) {
    const list = world[key];
    if (!Array.isArray(list)) continue;
    if (list.some(e => e?.id === id)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap resolution: GapDescriptor + ReaderGapPolicy → GapResolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применить policy к gap'у. Возвращает GapResolution с action и опциональным
 * value/placeholder для рендера.
 *
 * @param {GapDescriptor} gap
 * @param {ReaderGapPolicy} policy
 * @param {{ placeholder?: string }} [options]
 * @returns {GapResolution}
 */
export function resolveGap(gap, policy, options = {}) {
  if (!gap || typeof gap !== "object") {
    throw new Error("resolveGap: gap must be a GapDescriptor object");
  }
  if (!policy || typeof policy !== "object") {
    throw new Error("resolveGap: policy must be a ReaderGapPolicy object");
  }

  const action = policy[gap.kind];
  if (!action) {
    throw new Error(`resolveGap: policy has no action for gap kind "${gap.kind}"`);
  }

  /** @type {GapResolution} */
  const base = { action, gap };

  switch (action) {
    case "passthrough":
    case "broken-link":
      return { ...base, value: gap.value };
    case "placeholder":
      return { ...base, placeholder: options.placeholder ?? DEFAULT_PLACEHOLDER };
    case "hidden":
    case "omit":
      return base;
    case "error":
      return base;
    default:
      // Неизвестный action — пробрасываем для обнаружения misconfigured policy.
      throw new Error(`resolveGap: unknown action "${action}" in policy`);
  }
}

/**
 * Удобная композиция detectFieldGap + resolveGap. Если gap не обнаружен,
 * возвращает null — caller рендерит value как обычно.
 *
 * @param {unknown} value
 * @param {Object} fieldDef
 * @param {ReaderGapPolicy} policy
 * @param {{ entity?: string, field?: string, world?: World, typeMap?: Record<string, string>, placeholder?: string }} [ctx]
 * @returns {GapResolution | null}
 */
export function resolveFieldGap(value, fieldDef, policy, ctx = {}) {
  const gap = detectFieldGap(value, fieldDef, ctx);
  if (!gap) return null;
  return resolveGap(gap, policy, { placeholder: ctx.placeholder });
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: scan entity-row для всех gap'ов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Собрать все gap'ы по сущности — пройтись по fieldDefs и проверить каждое поле.
 * Используется Layer 4 detector'ом (Phase 5) для cross-reader equivalence
 * comparison.
 *
 * @param {Object} entity — row из world (после fold)
 * @param {Record<string, Object>} fieldDefs — ontology.entities[X].fields
 * @param {{ entity?: string, world?: World, typeMap?: Record<string, string> }} [ctx]
 * @returns {GapDescriptor[]}
 */
export function scanEntityGaps(entity, fieldDefs, ctx = {}) {
  if (!entity || typeof entity !== "object") return [];
  if (!fieldDefs || typeof fieldDefs !== "object") return [];
  const out = [];
  for (const [field, def] of Object.entries(fieldDefs)) {
    const value = entity[field];
    const gap = detectFieldGap(value, def, { ...ctx, field });
    if (gap) out.push(gap);
  }
  return out;
}
