/**
 * Извлекает @relation-attribute из Prisma-полей и
 * проставляет relations[fk-column] = { entity, kind: "belongs-to" } на child-entity.
 *
 * Multi-column FKs пока игнорируются (rare case).
 */
export function buildRelations(entities, models) {
  for (const model of models) {
    const childEntity = entities[model.name];
    if (!childEntity) continue;

    for (const field of model.fields) {
      if (field.array) continue; // list-relation (many)
      const relationAttr = field.attributes?.find((a) => a.name === "relation");
      if (!relationAttr) continue;

      const fields = extractListArg(relationAttr, "fields");
      if (!fields || fields.length !== 1) continue; // single-column only

      const parentEntityName = field.fieldType;
      if (!entities[parentEntityName]) continue;

      if (!childEntity.relations) childEntity.relations = {};
      childEntity.relations[fields[0]] = {
        entity: parentEntityName,
        kind: "belongs-to",
      };
    }
  }
}

function extractListArg(attr, key) {
  for (const arg of attr.args ?? []) {
    const v = arg.value;
    if (v && typeof v === "object" && v.type === "keyValue" && v.key === key) {
      const arr = v.value;
      if (arr && arr.type === "array") {
        // В реальной форме @mrleebo/prisma-ast args — это строки.
        // В старой/альтернативной форме могли быть объекты с .value.
        return (arr.args ?? []).map((a) => (typeof a === "string" ? a : a?.value));
      }
    }
  }
  return undefined;
}
