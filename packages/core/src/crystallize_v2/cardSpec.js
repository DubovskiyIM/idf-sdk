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
 * Используется (1) в assignToSlotsCatalog для projections с
 * layout: "grid" в authored shape, и (2) в grid-card-layout
 * pattern.structure.apply для декларативного обогащения.
 */
import { inferFieldRole } from "./ontologyHelpers.js";

/**
 * Построить cardSpec из witnesses списка проекции.
 * Чистая функция: без мутации входов, возвращает {} если нечего собрать.
 *
 * @param {Array<string|{field:string,compute:string}>} witnesses
 * @param {string} mainEntity
 * @param {object} ontology
 * @returns {object} cardSpec — частичный, только найденные роли
 */
export function buildCardSpec(witnesses, mainEntity, ontology) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return {};
  const entityDef = ontology?.entities?.[mainEntity];
  const ontologyFields = entityDef?.fields || {};
  const cardSpec = {};
  const metrics = [];

  for (const witness of witnesses) {
    // Computed witness — объект {field, compute}: используем field как имя
    if (typeof witness === "object" && witness !== null && witness.compute) {
      const role = inferFieldRole(witness.field, {})?.role ?? null;
      if (role === "metric" || role === "info") {
        metrics.push({ bind: witness.field, compute: witness.compute });
      }
      continue;
    }

    if (typeof witness !== "string") continue;

    const fieldName = witness.includes(".") ? witness.split(".")[0] : witness;
    const fieldDef = typeof ontologyFields === "object" && !Array.isArray(ontologyFields)
      ? ontologyFields[fieldName] : null;
    const role = inferFieldRole(fieldName, fieldDef || {})?.role ?? null;

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
