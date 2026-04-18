/**
 * parseCreatesVariant — парсит intent.creates формата "Entity" или "Entity(variant)".
 *
 * Расширяет existing normalizeCreates (strip parens). Возвращает обе части.
 *
 * @param {string|null|undefined} creates
 * @returns {{ entity: string|null, variant: string|null }}
 */
export function parseCreatesVariant(creates) {
  if (typeof creates !== "string" || !creates) {
    return { entity: null, variant: null };
  }
  const m = creates.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (m) {
    return { entity: m[1].trim(), variant: m[2].trim() };
  }
  return { entity: creates.trim(), variant: null };
}
