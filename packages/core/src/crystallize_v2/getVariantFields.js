/**
 * getVariantFields — merge shared fields + variant-specific fields для polymorphic entity.
 *
 * Правила (§2.2 design spec):
 *  - variantKey null или отсутствует variants → только shared fields
 *  - unknown variant → shared + warning
 *  - variant.fields пытается override shared → shared wins + warning
 *
 * @param {object} entity
 * @param {string|null} variantKey
 * @returns {{ fields: Record<string, object>, warnings: string[] }}
 */
export function getVariantFields(entity, variantKey) {
  const warnings = [];
  const shared = (entity?.fields && !Array.isArray(entity.fields)) ? { ...entity.fields } : {};

  if (!entity?.variants || !variantKey) {
    return { fields: shared, warnings };
  }

  const variant = entity.variants[variantKey];
  if (!variant) {
    warnings.push(`variant '${variantKey}' not found in entity.variants`);
    return { fields: shared, warnings };
  }

  const variantFields = variant.fields || {};
  const merged = { ...shared };
  for (const [name, def] of Object.entries(variantFields)) {
    if (name in shared) {
      warnings.push(`variant '${variantKey}'.fields.${name} conflicts with shared; shared wins`);
      continue;
    }
    merged[name] = def;
  }

  return { fields: merged, warnings };
}
