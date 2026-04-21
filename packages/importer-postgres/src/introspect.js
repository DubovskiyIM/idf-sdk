const TABLES_SQL = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = $1
    AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

const COLUMNS_SQL = `
  SELECT table_name, column_name, data_type, is_nullable, column_default,
         character_maximum_length, ordinal_position
  FROM information_schema.columns
  WHERE table_schema = $1
  ORDER BY table_name, ordinal_position
`;

const PK_SQL = `
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = $1
    AND tc.constraint_type = 'PRIMARY KEY'
  ORDER BY tc.table_name, kcu.ordinal_position
`;

const FK_SQL = `
  SELECT
    kcu.table_name    AS "table",
    kcu.column_name   AS "column",
    ccu.table_name    AS ref_table,
    ccu.column_name   AS ref_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = $1
    AND tc.constraint_type = 'FOREIGN KEY'
`;

export async function introspect(client, { schema = "public" } = {}) {
  const [tables, columns, pks, fks] = await Promise.all([
    client.query(TABLES_SQL, [schema]),
    client.query(COLUMNS_SQL, [schema]),
    client.query(PK_SQL, [schema]),
    client.query(FK_SQL, [schema]),
  ]);

  const columnsByTable = new Map();
  for (const c of columns.rows) {
    if (!columnsByTable.has(c.table_name)) columnsByTable.set(c.table_name, []);
    columnsByTable.get(c.table_name).push(c);
  }

  const pkByTable = new Map();
  for (const { table_name, column_name } of pks.rows) {
    if (!pkByTable.has(table_name)) pkByTable.set(table_name, []);
    pkByTable.get(table_name).push(column_name);
  }

  return {
    tables: tables.rows.map((t) => ({
      table_name: t.table_name,
      columns: columnsByTable.get(t.table_name) || [],
      primary_key: pkByTable.get(t.table_name) || [],
    })),
    foreign_keys: fks.rows,
  };
}
