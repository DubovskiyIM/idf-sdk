/**
 * Построение item.children catalog-карточки из projection.witnesses (strict).
 *
 * Сценарий: автор задаёт `projection.witnesses: ["title","budget","deadline","status"]`
 * — и хочет увидеть именно эти 4 поля в карточке каталога, с правильными
 * primitive'ами (heading / money / countdown / badge), без ручного JSX.
 *
 * Для non-grid layout'ов раньше `projection.witnesses` игнорировался и карточка
 * всегда выводилась через hardcoded `avatar + title + subtitle` в
 * `buildCatalogBody`. Grid-layout (`buildCardSpec` + `grid-card-layout` pattern)
 * витнессы учитывал, flat-list — нет.
 *
 * §3.1 Workzilla dogfood findings (P0-3).
 *
 * Контракт:
 *  - вход: массив witness'ов (string | {field,compute}) + mainEntity + ontology
 *  - выход: плоский массив node'ов для `card.children` (не обёрнут в
 *    row/column — обёртка выбирается в `buildCatalogBody` по наличию heroImage).
 *
 * Role→primitive mapping (inferFieldRole):
 *  - title     → text style=heading (крупный заголовок)
 *  - description → text style=secondary
 *  - price     → text format=currency style=money (позже — money-primitive)
 *  - badge     → badge (status / enum / condition)
 *  - heroImage → avatar (обычно уходит в row-left; см. buildItemShell)
 *  - timer / deadline → timer (inline countdown)
 *  - timestamp / scheduled / occurred → text format=datetime
 *  - metric    → text format=number
 *  - address / location / zone → text style=secondary
 *  - ref / info / fallback → text
 */

import { inferFieldRole } from "./ontologyHelpers.js";

/**
 * Разобрать witness-строку в { fieldName, bind }.
 * Self-aliased "<mainEntity>.field" → strip алиас, bind = остаток.
 * Cross-entity "owner.name" → bind = full, fieldName = last segment.
 */
export function splitWitnessPath(witness, mainEntity) {
  if (typeof witness !== "string") return null;
  if (!witness.includes(".")) {
    return { fieldName: witness, bind: witness };
  }
  const parts = witness.split(".");
  const prefix = parts[0];
  const mainLower = typeof mainEntity === "string" ? mainEntity.toLowerCase() : "";
  if (prefix.toLowerCase() === mainLower) {
    const rest = parts.slice(1).join(".");
    return { fieldName: rest.split(".")[0], bind: rest };
  }
  return { fieldName: parts[parts.length - 1], bind: witness };
}

/**
 * Получить fieldDef для имени поля в mainEntity (оба формата fields).
 */
function getFieldDef(fieldName, entity) {
  if (!entity || !entity.fields) return {};
  if (Array.isArray(entity.fields)) return {};
  return entity.fields[fieldName] || {};
}

/**
 * Одиночный witness → child-node карточки.
 * Возвращает null, если witness нераспознаваем.
 */
export function witnessToItemChild(witness, mainEntity, ONTOLOGY) {
  // Computed witness (aggregation) — { field, compute }
  if (typeof witness === "object" && witness !== null && typeof witness.field === "string") {
    return {
      type: "text",
      bind: witness.field,
      compute: witness.compute,
      style: "secondary",
      format: "number",
    };
  }

  const parsed = splitWitnessPath(witness, mainEntity);
  if (!parsed) return null;

  const entity = ONTOLOGY?.entities?.[mainEntity];
  const fieldDef = getFieldDef(parsed.fieldName, entity);
  const role = inferFieldRole(parsed.fieldName, fieldDef)?.role;
  const { bind } = parsed;

  switch (role) {
    case "title":
      return { type: "text", bind, style: "heading" };
    case "description":
      return { type: "text", bind, style: "secondary" };
    case "price":
    case "money":
      return { type: "text", bind, format: "currency", style: "money" };
    case "badge":
      return { type: "badge", bind };
    case "heroImage":
      return { type: "avatar", bind, size: 40 };
    case "timer":
    case "deadline":
      return { type: "timer", bind };
    case "timestamp":
    case "scheduled":
    case "occurred":
      return { type: "text", bind, style: "secondary", format: "datetime" };
    case "metric":
      return { type: "text", bind, style: "secondary", format: "number" };
    case "address":
    case "location":
    case "zone":
      return { type: "text", bind, style: "secondary" };
    case "coordinate":
      return { type: "text", bind, style: "muted" };
    case "ref":
      return { type: "text", bind, style: "secondary" };
    case "info":
    default:
      return { type: "text", bind };
  }
}

/**
 * Массив witness'ов → массив child-node'ов (пропуская нераспознанные).
 */
export function buildWitnessChildren(witnesses, mainEntity, ONTOLOGY) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return [];
  return witnesses
    .map((w) => witnessToItemChild(w, mainEntity, ONTOLOGY))
    .filter(Boolean);
}

/**
 * Есть ли среди witness'ов поле с ролью heroImage — если да, его имя нужно
 * buildCatalogBody чтобы положить аватар в левый столбец, а остальные
 * witness'ы в правый.
 */
export function findHeroImageWitness(witnesses, mainEntity, ONTOLOGY) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return null;
  const entity = ONTOLOGY?.entities?.[mainEntity];
  for (const w of witnesses) {
    if (typeof w !== "string") continue;
    const parsed = splitWitnessPath(w, mainEntity);
    if (!parsed) continue;
    const fieldDef = getFieldDef(parsed.fieldName, entity);
    const role = inferFieldRole(parsed.fieldName, fieldDef)?.role;
    if (role === "heroImage") return { bind: parsed.bind, witness: w };
  }
  return null;
}
