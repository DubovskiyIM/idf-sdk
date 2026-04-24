import { canonicalizeGrpcOperationId } from "./canonicalizeGrpcOperationIds.js";

const SKIPPED_PREFIXES = new Set(["api", "v1", "v2", "v3"]);

/**
 * Explicit action-verb list. Path ending `/{param}/X`, где X начинается с
 * любого из этих verbs (optionally followed by `-suffix`), трактуется как
 * action над идентифицированным parent-ресурсом, а не как sub-collection.
 * Intent.target = parent entity, intent.name = camelCase(actionSegment)+parent.
 *
 * Closes G-K-2 (Keycloak): 21 path вида `/users/{id}/reset-password`,
 * `/clients/{id}/test-nodes-available`, `/authentication/executions/{id}/
 * lower-priority` переставали материализоваться как entity `ResetPassword` /
 * `TestNodesAvailable` / `LowerPriority`.
 *
 * Conservative: only explicit verb-prefix. Plural collections
 * (`/users/{id}/role-mappings`, `/users/{id}/credentials`) не трогаются.
 */
const ACTION_VERBS = [
  "activate", "deactivate",
  "test",
  "reset",
  "send",
  "move",
  "logout", "logoff", "login",
  "copy",
  "import", "export",
  "sync", "clear",
  "validate", "verify",
  "restart", "stop", "start", "pause", "resume",
  "run",
  "convert", "parse", "evaluate",
  "download", "upload",
  "enable", "disable",
  "refresh",
  "lower", "raise",
  "install", "uninstall",
  "approve", "reject", "dismiss",
  "publish", "unpublish",
  "register", "unregister",
  "cancel", "complete", "finish",
  "archive", "restore",
  "attach", "detach",
  "link", "unlink",
  "assign", "unassign",
  "grant", "revoke",
  "subscribe", "unsubscribe",
  "confirm",
];
const ACTION_VERB_RE = new RegExp(
  "^(" + ACTION_VERBS.join("|") + ")(?:[-_][a-z0-9]+)*$",
  "i",
);

function isActionVerbSegment(segment) {
  if (!segment || segment.startsWith("{")) return false;
  return ACTION_VERB_RE.test(segment);
}

/**
 * Detects action-endpoint shape: `/.../collection/{param}/action-verb`.
 * Returns `{ parentEntity, actionSegment, actionName }` or null если это
 * обычный sub-collection или не action.
 *
 * @param {string} path — OpenAPI path с `{param}` syntax
 * @returns {{ parentEntity: string, actionSegment: string, actionName: string } | null}
 */
export function detectActionEndpoint(path) {
  const segs = path.split("/").filter(Boolean);
  if (segs.length < 3) return null;
  const last = segs[segs.length - 1];
  const beforeLast = segs[segs.length - 2];
  if (!last || last.startsWith("{")) return null;
  if (!beforeLast || !beforeLast.startsWith("{")) return null;
  if (!isActionVerbSegment(last)) return null;
  // Parent collection — сегмент перед {param}. Ищем ближайший не-{param}, не-skip.
  let parentCollection = null;
  for (let i = segs.length - 3; i >= 0; i--) {
    const s = segs[i];
    if (s.startsWith("{")) continue;
    if (SKIPPED_PREFIXES.has(s.toLowerCase())) continue;
    parentCollection = s;
    break;
  }
  if (!parentCollection) return null;
  const parentEntity = toPascalSingular(parentCollection);
  // actionName: camelCase из action-segment. "reset-password" → "resetPassword".
  const actionName = kebabToCamel(last);
  return { parentEntity, actionSegment: last, actionName };
}

function kebabToCamel(s) {
  const parts = s.split(/[-_]/);
  if (parts.length === 0) return s;
  return parts[0].toLowerCase()
    + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}

/**
 * Сегмент представляет plural collection? Эвристика через `singularize`:
 * если сингуляризация меняет форму — это был plural (`users` → `user` ✓,
 * `login` → `login` ✗). Используется для G-K-8 — detect "POST на nested
 * collection" shape, чтобы intent был create-over-child, а не legacy-action.
 */
function isPluralCollection(seg) {
  if (!seg || seg.startsWith("{")) return false;
  const lower = seg.toLowerCase();
  const singular = singularize(lower);
  return singular !== lower && singular.length > 0;
}

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
export function pathToIntent(method, path, operation, opts = {}) {
  const methodUpper = method.toUpperCase();
  const pathParams = extractPathParams(path);
  const hasTrailingParam = endsWithPathParam(path);
  const idfPath = openApiPathToIdf(path);
  const collectionPostAsCreate = opts.collectionPostAsCreate !== false;

  // G-K-2: action-endpoint shape — `/collection/{param}/action-verb`.
  // Intent.target = parent entity (не action-verb); intent.name =
  // actionVerb + Parent (camelCase). Action-verbs detection — conservative,
  // explicit list (см. ACTION_VERBS). Intent.alpha = "replace".
  const action = detectActionEndpoint(path);
  const entity = action ? action.parentEntity : entityNameFromPath(path);

  const intent = {
    target: entity,
    endpoint: { method: methodUpper, path: idfPath },
    parameters: {},
  };
  for (const p of pathParams) {
    intent.parameters[p] = { type: "string", required: true };
  }

  let name;
  if (action) {
    // action всегда над identified resource → replace
    name = `${action.actionName}${entity}`;
    intent.alpha = "replace";
  } else if (methodUpper === "POST") {
    // POST /tasks → create; POST /tasks/{id}/sub-collection → generic
    const segs = path.split("/").filter(Boolean);
    const lastSeg = segs[segs.length - 1];
    if (hasTrailingParam) {
      // редкий, но валидный case: POST /tasks/{id} — трактуем как create
      name = `create${entity}`;
      intent.alpha = "insert";
    } else if (pathParams.length > 0 && lastSeg && !lastSeg.startsWith("{")) {
      // G-K-8: если lastSeg — plural collection (`users`, `groups`,
      // `role-mappings`), это POST на nested collection — create-over-child.
      // Иначе legacy action (не-verb, не-plural segment после {param}).
      if (collectionPostAsCreate && isPluralCollection(lastSeg)) {
        // POST /realms/{realm}/users → createUser (α=insert, creates=User).
        // Без этого R1 catalog-rule не срабатывал на nested collections.
        name = `create${entity}`;
        intent.alpha = "insert";
      } else {
        // legacy: /tasks/{id}/custom-endpoint (не verb, не plural) → replace
        name = `${lastSeg.replace(/-/g, "_")}${entity}`;
        intent.alpha = "replace";
      }
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
    // G-A-7 (ArgoCD): grpc-gateway генерирует operationId как
    // `<Entity>Service_<VerbNoun>` (ApplicationService_Create). IDF авторинг
    // ожидает canonical `<verb><Entity>` (createApplication). Host ранее
    // поддерживал INTENT_RENAME table. Opt-out через
    // opts.canonicalizeGrpcOperationIds=false.
    const canonical = opts.canonicalizeGrpcOperationIds !== false
      ? canonicalizeGrpcOperationId(operation.operationId)
      : null;
    name = canonical || operation.operationId;
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
