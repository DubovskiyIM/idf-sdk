import { mapColumn } from "./mapColumn.js";

const OWNER_FIELDS = ["user_id", "owner_id", "author_id", "created_by"];

function toPascalSingular(tableName) {
  const parts = tableName.split("_");
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  return singularize(pascal);
}

function singularize(word) {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/ses$/i.test(word)) return word.replace(/ses$/i, "s");
  if (/xes$/i.test(word)) return word.replace(/xes$/i, "x");
  if (/zes$/i.test(word)) return word.replace(/zes$/i, "z");
  if (/ches$/i.test(word)) return word.replace(/ches$/i, "ch");
  if (/shes$/i.test(word)) return word.replace(/shes$/i, "sh");
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, "");
  return word;
}

export function mapTable({ table_name, columns, primary_key }) {
  const pkSet = new Set(primary_key || []);
  const fields = {};
  for (const col of columns) {
    fields[col.column_name] = mapColumn(col, {
      isPrimaryKey: pkSet.has(col.column_name),
    });
  }

  const ownerField = columns.find((c) => OWNER_FIELDS.includes(c.column_name))?.column_name;

  const entity = {
    name: toPascalSingular(table_name),
    kind: "internal",
    fields,
  };
  if (ownerField) entity.ownerField = ownerField;

  return entity;
}
