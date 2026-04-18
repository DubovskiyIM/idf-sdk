/**
 * cardSpec — декларативное описание grid-карточки для catalog-архетипа
 * с `layout: "grid"`. Генерируется из witnesses проекции + семантических
 * ролей полей (inferFieldRole).
 *
 * Слоты карточки (первое совпадение побеждает по каждой роли):
 *  - image     ← heroImage (type: image / multiImage)
 *  - title     ← title (name / title / label)
 *  - price     ← price (number + name contains price/cost/amount)
 *  - badge     ← badge (enum / status / condition)
 *  - timer     ← timer (datetime + name contains end/deadline/expir)
 *  - location  ← location / address / zone
 *  - metrics   ← metric (number fallback) — массив, собирает всё
 *
 * Polymorphic entities (v0.15): если entity.discriminator && entity.variants —
 * emit `{variants: {[key]: spec}, discriminator}`. Каждый variant получает
 * свой cardSpec из merged shared + variant.fields.
 */
import { inferFieldRole } from "./ontologyHelpers.js";
import { getVariantFields } from "./getVariantFields.js";

function buildCardSpecOverFields(witnesses, fieldMap) {
  const cardSpec = {};
  const metrics = [];

  for (const witness of witnesses) {
    if (typeof witness === "object" && witness !== null && witness.compute) {
      const role = inferFieldRole(witness.field, {})?.role ?? null;
      if (role === "metric" || role === "info") {
        metrics.push({ bind: witness.field, compute: witness.compute });
      }
      continue;
    }

    if (typeof witness !== "string") continue;

    const fieldName = witness.includes(".") ? witness.split(".")[0] : witness;
    const fieldDef = fieldMap[fieldName];
    // Polymorphic: witness ссылается на поле чужого variant'а — skip
    if (!fieldDef) continue;
    const role = inferFieldRole(fieldName, fieldDef)?.role ?? null;

    switch (role) {
      case "heroImage":
        if (!cardSpec.image) cardSpec.image = { bind: fieldName };
        break;
      case "title":
        if (!cardSpec.title) cardSpec.title = { bind: fieldName };
        break;
      case "price":
        if (!cardSpec.price) cardSpec.price = { bind: fieldName, format: "currency", suffix: " ₽" };
        break;
      case "badge":
        if (!cardSpec.badge) cardSpec.badge = { bind: fieldName };
        break;
      case "timer":
        if (!cardSpec.timer) cardSpec.timer = { bind: fieldName, format: "countdown" };
        break;
      case "location":
        if (!cardSpec.location) cardSpec.location = { bind: fieldName };
        break;
      case "metric":
        metrics.push({ bind: fieldName, label: fieldDef?.label || fieldName });
        break;
    }
  }

  if (metrics.length > 0) cardSpec.metrics = metrics;
  return cardSpec;
}

/**
 * Построить cardSpec из witnesses списка проекции.
 *
 * @param {Array<string|{field:string,compute:string}>} witnesses
 * @param {string} mainEntity
 * @param {object} ontology
 * @returns {object} cardSpec — либо legacy single-spec, либо polymorphic { variants, discriminator }
 */
export function buildCardSpec(witnesses, mainEntity, ontology) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return {};
  const entityDef = ontology?.entities?.[mainEntity];
  if (!entityDef) return {};

  const isPoly = entityDef.discriminator && entityDef.variants;
  if (isPoly && !Array.isArray(entityDef.fields)) {
    const variantKeys = Object.keys(entityDef.variants);
    const variants = {};
    for (const key of variantKeys) {
      const { fields: merged } = getVariantFields(entityDef, key);
      variants[key] = buildCardSpecOverFields(witnesses, merged);
    }
    return { variants, discriminator: entityDef.discriminator };
  }

  // Legacy single-cardSpec path (backward-compat)
  const ontologyFields = entityDef.fields || {};
  const fieldMap = Array.isArray(ontologyFields)
    ? Object.fromEntries(ontologyFields.map(n => [n, {}]))
    : ontologyFields;
  return buildCardSpecOverFields(witnesses, fieldMap);
}
