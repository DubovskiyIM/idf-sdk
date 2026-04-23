/**
 * Имя-паттерн эвристика для `fieldRole`: без heavy-hand schema analysis
 * прописываем semantic роли (secret / datetime / email / url) по имени.
 * Pattern-bank primitives (secret-mask, date-relative, email-link) требуют
 * hint — importer-openapi без этого даёт plain-text UI для password, ISO-string
 * для datetime, flat text для email.
 *
 * Conservative:
 *   - Не перезаписываем authored / already-inferred fieldRole
 *   - False-positive guard: `refreshTokenMaxReuse` — это число секунд,
 *     не секрет (hint = secret match'ится по `*Token*`, но number-type
 *     блокирует через field.type check)
 *
 * Closes G-K-7 (Keycloak) + Gravitino field-role backlog.
 */

const SECRET_PATTERNS = [
  /^password$/i,
  /^.*[Pp]assword$/,
  /^secret$/i,
  /^.*[Ss]ecret$/,
  /^token$/i,
  /^registrationAccessToken$/,
  /^store_?password$/i,
  /^key_?password$/i,
  /^client_?secret$/i,
  /^.*ApiKey$/,
  /^.*AccessKey$/,
];
const DATETIME_PATTERNS = [
  /^.*[Dd]ate$/,
  /^.*[Tt]imestamp$/,
  /^expir.*$/i,
  /^.*ExpiresAt$/,
  /^notBefore$/,
  /^updated_?at$/i,
  /^created_?at$/i,
  /^deleted_?at$/i,
  /^sentDate$/,
  /^lastUpdatedDate$/,
  /^createdTimestamp$/,
  /^.*Time$/,
];
const EMAIL_PATTERNS = [/^email$/i, /^.*Email$/];
const URL_PATTERNS = [
  /^.*[Uu]rl$/,
  /^.*[Uu]ri$/,
  /^redirectUris?$/,
  /^webOrigins$/,
  /^.*Endpoint$/,
  /^href$/i,
  /^callback$/i,
];

// Number-like field.type'ы — guard от false-positive secret'ов на
// полях вида `refreshTokenMaxReuse` (счётчик, не токен).
const NUMERIC_TYPES = new Set(["number", "integer", "int", "int32", "int64", "float", "double"]);

function matchAny(name, patterns) {
  return patterns.some(p => p.test(name));
}

/**
 * Infers fieldRole из `fieldName` с учётом field.type как guard.
 * @param {string} name
 * @param {{ type?: string }} def
 * @returns {"secret"|"datetime"|"email"|"url"|null}
 */
export function inferFieldRole(name, def) {
  if (!name) return null;
  const type = def?.type;
  // Numeric — никогда не secret/datetime (по имени) и не url/email
  if (NUMERIC_TYPES.has(type)) return null;

  if (matchAny(name, SECRET_PATTERNS)) return "secret";
  if (matchAny(name, DATETIME_PATTERNS)) return "datetime";
  if (matchAny(name, EMAIL_PATTERNS)) return "email";
  if (matchAny(name, URL_PATTERNS)) return "url";
  return null;
}

/**
 * Применяет `inferFieldRole` к каждому полю каждой entity.
 * Existing `fieldRole` не перезаписывается (authored wins).
 *
 * @param {Record<string, object>} entities
 * @returns {Record<string, object>}
 */
export function inferFieldRolesForEntities(entities) {
  const result = {};
  for (const [entityName, entity] of Object.entries(entities || {})) {
    const fields = entity?.fields || {};
    if (Array.isArray(fields) || !fields) {
      result[entityName] = entity;
      continue;
    }
    const nextFields = {};
    let changed = false;
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const def = fieldDef || {};
      if (def.fieldRole) {
        nextFields[fieldName] = def;
        continue;
      }
      const inferred = inferFieldRole(fieldName, def);
      if (inferred) {
        nextFields[fieldName] = { ...def, fieldRole: inferred };
        changed = true;
      } else {
        nextFields[fieldName] = def;
      }
    }
    result[entityName] = changed ? { ...entity, fields: nextFields } : entity;
  }
  return result;
}
