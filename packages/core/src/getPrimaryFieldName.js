/**
 * getPrimaryFieldName — единая точка определения primary-display поля
 * для entity. Используется voice materializer'ом / document materializer'ом /
 * SDK derivation для отображения row'а одной строкой («заголовок»).
 *
 * Приоритет (по выходу):
 *   1. Поле с явным `fieldRole: "primary"` или legacy `fieldRole: "primary-title"`
 *      или `role: "primary-title"`.
 *   2. Hardcoded fallback names: name / title / label / displayName.
 *   3. Любое первое поле типа text/email/textarea (если вход — entity ontology).
 *   4. "id" как ultimate fallback.
 *
 * Закрывает §12.2 (Notion field test, 2026-04-26): voice materializer
 * хардкодил `r.name || r.title || r.ticker || r.id`. Notion Page имеет
 * `title` (как у настоящего Notion), но новые vertical'и могут использовать
 * другие имена (например, `displayName` в keycloak).
 */

const PRIMARY_FIELD_NAMES = ["name", "title", "label", "displayName", "ticker"];
const TEXT_FIELD_TYPES = new Set(["text", "textarea", "email"]);

/**
 * Возвращает имя primary-display поля для entity.
 * @param {object|null} entityDef — entity declaration (с fields)
 * @returns {string} — имя поля (default: "id")
 */
export function getPrimaryFieldName(entityDef) {
  const fields = entityDef?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "id";

  // 1. Явный fieldRole / role
  for (const [name, def] of Object.entries(fields)) {
    if (!def || typeof def !== "object") continue;
    const role = def.fieldRole || def.role;
    if (role === "primary" || role === "primary-title") return name;
  }

  // 2. Hardcoded имена
  for (const pref of PRIMARY_FIELD_NAMES) {
    if (fields[pref]) return pref;
  }

  // 3. Первое text-поле (но не "id" — это системный)
  for (const [name, def] of Object.entries(fields)) {
    if (name === "id") continue;
    if (def && typeof def === "object" && TEXT_FIELD_TYPES.has(def.type)) return name;
  }

  return "id";
}

/**
 * Возвращает primary-display значение row'а для entity.
 * Удобный wrapper для voice/document materializer'ов.
 * @param {object} row
 * @param {object|null} entityDef
 * @returns {string}
 */
export function getPrimaryFieldValue(row, entityDef) {
  if (!row) return "";
  const field = getPrimaryFieldName(entityDef);
  const value = row[field];
  if (value == null || value === "") return String(row.id || "");
  return String(value);
}
