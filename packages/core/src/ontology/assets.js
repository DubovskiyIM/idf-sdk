/**
 * Asset-boundary helpers (§19 v1.7 terminological insight).
 *
 * Assets — источники визуальных/звуковых/шрифтовых ресурсов, НЕ участвующих
 * в Φ / fold / causal order. Отличаются от effect-boundary (§19) тем, что
 * runtime получает их как binary payload (PNG-тайлы, шрифты, emoji-sprites),
 * не как effects. Требуют другой trust-модели (graceful degradation vs
 * conflict-resolution), кэш-стратегии (LRU vs last-write-wins), и auth-модели
 * (public CDN vs JWT+scope).
 *
 * Пока runtime их не enforce'ит — это чисто декларативная surface для audit,
 * CSP-генерации, subresource-integrity. Production SDK может использовать
 * validateAsset для фиксации требований.
 */

export const ASSET_KINDS = ["tiles", "emoji", "font", "media"];

/**
 * Получить assets ontology, опционально отфильтровав по kind.
 */
export function getAssets(ontology, kind = null) {
  if (!ontology || !Array.isArray(ontology.assets)) return [];
  if (!kind) return ontology.assets;
  return ontology.assets.filter(a => a.kind === kind);
}

/**
 * Валидация формы asset declaration.
 * Возвращает { valid, reason? }.
 */
export function validateAsset(asset) {
  if (!asset || typeof asset !== "object") {
    return { valid: false, reason: "asset должен быть объектом" };
  }
  if (!asset.id || typeof asset.id !== "string") {
    return { valid: false, reason: "asset.id (string) обязателен" };
  }
  if (!asset.kind || !ASSET_KINDS.includes(asset.kind)) {
    return { valid: false, reason: `asset.kind должен быть одним из: ${ASSET_KINDS.join(", ")}` };
  }
  if (!asset.url || typeof asset.url !== "string") {
    return { valid: false, reason: "asset.url (string) обязателен" };
  }
  return { valid: true };
}
