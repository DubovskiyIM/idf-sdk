export function buildRelations(entities, tableToEntity, fks) {
  for (const fk of fks) {
    const childEntityName = tableToEntity.get(fk.table)?.name;
    const parentEntityName = tableToEntity.get(fk.ref_table)?.name;
    if (!childEntityName || !parentEntityName) continue;

    const child = entities[childEntityName];
    if (!child) continue;

    if (!child.relations) child.relations = {};
    child.relations[fk.column] = {
      entity: parentEntityName,
      kind: "belongs-to",
    };
  }
}
