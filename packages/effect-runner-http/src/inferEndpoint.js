/**
 * Обратная трансформация entity-name → table-name (pluralize + snake_case).
 * Противоположна mapTable.js в importer-postgres.
 */
export function tableNameFor(entityName) {
  const snake = entityName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
  return pluralize(snake);
}

function pluralize(word) {
  if (/y$/i.test(word) && !/[aeiou]y$/i.test(word)) {
    return word.replace(/y$/i, "ies");
  }
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + "es";
  return word + "s";
}

/**
 * Выводит HTTP-endpoint из intent и target entity.
 * Если у intent есть `endpoint` override — используется он.
 *
 * Conventions:
 *   alpha:insert  → POST   /tasks
 *   alpha:replace → PATCH  /tasks/:id
 *   alpha:remove  → DELETE /tasks/:id
 *   query (нет alpha) без required-id → GET /tasks
 *   query с required-id parameter → GET /tasks/:id
 */
export function inferEndpoint({ name, intent, entity }) {
  if (intent.endpoint) return intent.endpoint;

  const table = tableNameFor(entity.name);
  const alpha = intent.alpha;

  if (alpha === "insert") return { method: "POST", path: `/${table}` };
  if (alpha === "replace") return { method: "PATCH", path: `/${table}/:id` };
  if (alpha === "remove") return { method: "DELETE", path: `/${table}/:id` };

  // query — list vs read
  const hasIdParam = Boolean(intent.parameters?.id?.required);
  return {
    method: "GET",
    path: hasIdParam ? `/${table}/:id` : `/${table}`,
  };
}
