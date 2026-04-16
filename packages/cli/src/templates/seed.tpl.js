/**
 * Шаблон seed.js — минимальный начальный мир для домена.
 * По одной демонстрационной записи на каждую non-reference сущность.
 */
export function render(ctx) {
  const { name, entities } = ctx;

  const seedEntries = entities
    .filter(e => e.kind !== "reference")
    .map(e => {
      const lowerPlural = e.name[0].toLowerCase() + e.name.slice(1) + "s";
      const sample = makeSampleRecord(e);
      return `  ${lowerPlural}: [\n    ${JSON.stringify(sample)}\n  ],`;
    })
    .join("\n");

  return `/**
 * Seed-данные для домена "${name}".
 * Стартовый мир с одной записью на сущность — для smoke-тестов и dev-режима.
 */
export const seed = {
${seedEntries}
};

export default seed;
`;
}

function makeSampleRecord(entity) {
  const rec = {};
  for (const f of entity.fields) {
    const lower = f.toLowerCase();
    if (lower === "id") rec[f] = `${entity.name.toLowerCase()}_1`;
    else if (lower.endsWith("id")) rec[f] = "user_1";
    else if (lower.includes("status")) rec[f] = "active";
    else if (lower.endsWith("at")) rec[f] = Date.now();
    else if (lower.includes("amount") || lower.includes("total") || lower.includes("price")) rec[f] = 100;
    else if (lower.includes("count") || lower.includes("quantity")) rec[f] = 1;
    else if (lower.startsWith("is") || lower.includes("active")) rec[f] = true;
    else rec[f] = `Sample ${f}`;
  }
  return rec;
}
