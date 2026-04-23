/**
 * OpenAPI-импорт часто даёт duplicate-пары: path-derived entity (короткое
 * имя `Realm` от `/admin/realms/{realm}`) + schema-derived envelope
 * (`RealmRepresentation` из `components.schemas`). Intent.target ссылается
 * на короткое имя, но все useful fields находятся в Representation-версии —
 * host видит два tabs, один почти пустой.
 *
 * Этот helper: для каждой пары `X` / `XRepresentation` сливает fields +
 * relations (rep — source-of-truth, имеет более полный schema), удаляет
 * `XRepresentation` из entities и возвращает `aliases` map для downstream
 * rewrite references и intent.creates/target'ов, если они указывали на
 * long имя.
 *
 * Scope: Keycloak (25 пар), AWS SDK-style envelopes, K8s-style Spec/Status
 * pairs (опционально через `suffix` opt).
 *
 * Closes G-K-1 (Keycloak dogfood) + Gravitino G2 (envelope-типы).
 */

/**
 * @param {Record<string, object>} entities
 * @param {object} [opts]
 * @param {string} [opts.suffix="Representation"] — длинное suffix'ование
 * @returns {{ entities: Record<string, object>, aliases: Record<string, string> }}
 */
export function mergeRepresentationDuplicates(entities, opts = {}) {
  const suffix = opts.suffix ?? "Representation";
  const result = { ...entities };
  const aliases = {};

  for (const name of Object.keys(entities)) {
    const longName = name + suffix;
    if (!result[longName]) continue;
    if (name === longName) continue; // paranoia: empty suffix

    const base = result[name];
    const rep = result[longName];

    result[name] = {
      ...base,
      ...rep,
      // keep base-имя (без suffix'а) в поле name — downstream кода expects
      // short form в entity.name
      name: base?.name || name,
      fields: { ...(base?.fields || {}), ...(rep?.fields || {}) },
      relations: { ...(base?.relations || {}), ...(rep?.relations || {}) },
    };
    delete result[longName];
    aliases[longName] = name;
  }

  return { entities: result, aliases };
}

/**
 * Переписывает `field.references` в entity.fields по aliases map.
 * Нужно после merge'а — FK, ссылавшиеся на `RealmRepresentation`, должны
 * теперь ссылаться на `Realm`.
 */
export function rewriteReferencesByAliases(entities, aliases) {
  if (!aliases || Object.keys(aliases).length === 0) return entities;
  const result = {};
  for (const [ename, entity] of Object.entries(entities)) {
    const fields = {};
    let changed = false;
    for (const [fname, field] of Object.entries(entity.fields || {})) {
      if (field?.references && aliases[field.references]) {
        fields[fname] = { ...field, references: aliases[field.references] };
        changed = true;
      } else {
        fields[fname] = field;
      }
    }
    result[ename] = changed ? { ...entity, fields } : entity;
  }
  return result;
}

/**
 * Переписывает intent.target / intent.creates по aliases — если importer
 * где-то вырезал длинное имя в intent-уровень, short-form становится
 * каноническим.
 */
export function rewriteIntentTargetsByAliases(intents, aliases) {
  if (!aliases || Object.keys(aliases).length === 0) return intents;
  const result = {};
  for (const [iid, intent] of Object.entries(intents)) {
    let next = intent;
    if (intent?.target && aliases[intent.target]) {
      next = { ...next, target: aliases[intent.target] };
    }
    if (intent?.creates && aliases[intent.creates]) {
      next = { ...next, creates: aliases[intent.creates] };
    }
    result[iid] = next;
  }
  return result;
}
