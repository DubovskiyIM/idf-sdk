const SKIPPED_PREFIXES = new Set(["api", "v1", "v2", "v3"]);

/**
 * /tasks → Task, /order-items → OrderItem, /api/v1/tasks → Task.
 * Берёт последний сегмент, который является collection-name (не {param}, не skip-prefix).
 */
export function entityNameFromPath(path) {
  const segs = path.split("/").filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.startsWith("{")) continue;
    if (SKIPPED_PREFIXES.has(s.toLowerCase())) continue;
    return toPascalSingular(s);
  }
  return "Unknown";
}

function toPascalSingular(seg) {
  const parts = seg.split(/[-_]/);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return singularize(pascal);
}

function singularize(word) {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/ses$/i.test(word)) return word.replace(/ses$/i, "s");
  if (/xes$/i.test(word)) return word.replace(/xes$/i, "x");
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, "");
  return word;
}

function openApiPathToIdf(path) {
  return path.replace(/\{(\w+)\}/g, ":$1");
}

function extractPathParams(path) {
  return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

/**
 * Заканчивается ли path на `/{...}` — это маркер row-id-семантики
 * (read/update/remove одного ресурса), независимо от имени параметра.
 * `/villagers/{villager}` → true, `/tasks/{id}/approve` → false.
 */
function endsWithPathParam(path) {
  return /\/\{[^}]+\}\/?$/.test(path);
}

/**
 * Маппинг HTTP method + path pattern → IDF intent.
 *
 * POST /tasks             → createTask (alpha: insert)
 * GET /tasks              → listTask
 * GET /tasks/{id}         → readTask
 * PATCH|PUT /tasks/{id}   → updateTask (alpha: replace)
 * DELETE /tasks/{id}      → removeTask (alpha: remove)
 * POST /tasks/{id}/foo    → fooTask (named, alpha: replace по умолчанию)
 *
 * Если operation.operationId задан — используется как имя intent.
 */
export function pathToIntent(method, path, operation) {
  const entity = entityNameFromPath(path);
  const methodUpper = method.toUpperCase();
  const pathParams = extractPathParams(path);
  const hasTrailingParam = endsWithPathParam(path);
  const idfPath = openApiPathToIdf(path);

  const intent = {
    target: entity,
    endpoint: { method: methodUpper, path: idfPath },
    parameters: {},
  };
  for (const p of pathParams) {
    intent.parameters[p] = { type: "string", required: true };
  }

  let name;
  if (methodUpper === "POST") {
    // POST /tasks → create; POST /tasks/{id}/approve → approve
    const segs = path.split("/").filter(Boolean);
    const lastSeg = segs[segs.length - 1];
    if (hasTrailingParam) {
      // редкий, но валидный case: POST /tasks/{id} — трактуем как create
      name = `create${entity}`;
      intent.alpha = "insert";
    } else if (pathParams.length > 0 && lastSeg && !lastSeg.startsWith("{")) {
      // /tasks/{id}/approve — action поверх existing ресурса
      name = `${lastSeg.replace(/-/g, "_")}${entity}`;
      intent.alpha = "replace";
    } else {
      name = `create${entity}`;
      intent.alpha = "insert";
    }
  } else if (methodUpper === "PATCH" || methodUpper === "PUT") {
    name = `update${entity}`;
    intent.alpha = "replace";
  } else if (methodUpper === "DELETE") {
    name = `remove${entity}`;
    intent.alpha = "remove";
  } else if (methodUpper === "GET") {
    name = hasTrailingParam ? `read${entity}` : `list${entity}`;
  } else {
    name = `${methodUpper.toLowerCase()}${entity}`;
  }

  if (operation.operationId) {
    name = operation.operationId;
  }

  // Native IDF format — для deriveProjections совместимости.
  // alpha:insert → creates + particles.confirmation:enter + effect:insert
  // alpha:replace / remove → только particles.effects[op]
  if (intent.alpha === "insert") {
    intent.creates = entity;
    intent.particles = {
      confirmation: "enter",
      effects: [{ target: entity, op: "insert" }],
    };
  } else if (intent.alpha === "replace" || intent.alpha === "remove") {
    intent.particles = {
      effects: [{ target: entity, op: intent.alpha }],
    };
  }

  return { name, intent };
}
