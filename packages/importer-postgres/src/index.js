import { mapTable } from "./mapTable.js";
import { buildRelations } from "./buildRelations.js";
import { buildIntents } from "./buildIntents.js";
import { introspect } from "./introspect.js";
import { serialize } from "./serialize.js";

export { serialize };

export function buildOntology(dump, opts = {}) {
  const tableToEntity = new Map();
  const entities = {};

  for (const table of dump.tables) {
    const entity = mapTable(table);
    entities[entity.name] = entity;
    tableToEntity.set(table.table_name, entity);
  }

  buildRelations(entities, tableToEntity, dump.foreign_keys);

  const intents = {};
  for (const entity of Object.values(entities)) {
    Object.assign(intents, buildIntents(entity));
  }

  return {
    name: opts.name ?? "default",
    entities,
    intents,
    roles: { owner: { base: "owner" } },
  };
}

export async function importPostgres({ connectionString, schema = "public" }) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const dump = await introspect(client, { schema });
    return buildOntology(dump);
  } finally {
    await client.end();
  }
}
