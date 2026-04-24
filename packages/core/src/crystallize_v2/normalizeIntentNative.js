/**
 * Bridge native-format intent'ов (importer-postgres / -openapi / -prisma +
 * scaffold-path авторы) в legacy-format, понятный остальному crystallize_v2.
 *
 * Native-format (importers emit + scaffold ontology):
 *   {
 *     target: "Task",
 *     alpha: "replace",
 *     permittedFor: ["customer"],
 *     parameters: { id: { type: "string", required: true }, title: {...} },
 *     particles: {
 *       confirmation: "enter",
 *       effects: [{ target: "Task", op: "insert" }],
 *     },
 *   }
 *
 * Legacy-format (freelance / invest / sales — ручные авторы):
 *   {
 *     particles: {
 *       entities: ["task: Task"],
 *       witnesses: ["task.title", "task.budget"],
 *       effects: [{ α: "replace", target: "task.status" }],
 *     },
 *     parameters: [{ name, type, required }],
 *   }
 *
 * Без нормализации `appliesToProjection` проваливает native-intent'ы
 * (пустой `particles.entities` → intent считается не относящимся к
 * mainEntity), и catalog/detail получают пустой toolbar. Это
 * закрытие Workzilla findings P0-1 (backlog §8.1) на уровне входа.
 *
 * Нормализация additive-only: существующие legacy-поля (particles.entities,
 * effects.α, parameters-array) не перезаписываются; intent без native-
 * полей проходит через no-op.
 */

/** Map native `op` → canonical `α`. `insert` — add нового row в коллекцию. */
const OP_TO_ALPHA = {
  insert: "add",
  add: "add",
  replace: "replace",
  update: "replace",
  remove: "remove",
  delete: "remove",
};

function pluralize(entity) {
  const lower = entity.toLowerCase();
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  if (lower.endsWith("s")) return lower + "es";
  return lower + "s";
}

/**
 * Normalize native-form effect {target, op} → legacy {target, α}.
 *  - α: "add" → target = plural lowercase (коллекция)
 *  - α: "replace" | "remove" → target = singular lowercase (row)
 *
 * Если effect уже имеет α — не трогаем (legacy-format уважается).
 */
function normalizeEffect(effect) {
  if (!effect || typeof effect !== "object") return effect;
  const hasAlpha = typeof effect.α === "string";
  const hasOp = typeof effect.op === "string";

  if (hasAlpha) return effect;
  if (!hasOp) return effect;

  const α = OP_TO_ALPHA[effect.op] || effect.op;
  const rawTarget = effect.target;

  // Если target уже dotted или lowercase → оставляем
  const isEntityName = typeof rawTarget === "string" && /^[A-Z]/.test(rawTarget) && !rawTarget.includes(".");
  if (!isEntityName) return { ...effect, α };

  const target = α === "add" ? pluralize(rawTarget) : rawTarget.toLowerCase();
  return { ...effect, α, target };
}

/**
 * Convert native object-parameters → array-parameters.
 *
 *   { id: { type, required }, title: { type } }
 *   → [{ name: "id", type, required }, { name: "title", type }]
 */
function normalizeParameters(parameters) {
  if (!parameters) return parameters;
  if (Array.isArray(parameters)) return parameters;
  if (typeof parameters !== "object") return parameters;

  return Object.entries(parameters).map(([name, def]) => {
    if (!def || typeof def !== "object") return { name };
    return { name, ...def };
  });
}

/**
 * Normalize single intent. Returns new object if any native-поле обнаружено,
 * иначе возвращает исходный intent (референтная равенство сохраняется).
 */
/**
 * Вывести confirmation из α для native-intent'ов, у которых автор её не
 * задекларировал. Без confirmation selectArchetype возвращает null, и
 * intent не попадает в UI.
 *
 *   α="add"     → "enter"   (composerEntry в feed / heroCreate в catalog)
 *   α="replace" → "form" если params (не считая id) > 0, иначе "click"
 *   α="remove"  → "click"   (irreversibility обычно отдельно даст confirmDialog)
 */
function inferConfirmation(intent, normalizedParameters) {
  const existing = intent?.confirmation ?? intent?.particles?.confirmation;
  if (existing) return null;

  // Native-format маркеры: top-level `target` или `alpha` или effect.op.
  // Legacy-intent'ы без confirmation — это click-архетип по умолчанию;
  // они и так работают через clickForm, мы их не трогаем.
  const effects = Array.isArray(intent?.particles?.effects) ? intent.particles.effects : [];
  const isNative = typeof intent?.target === "string"
    || typeof intent?.alpha === "string"
    || effects.some(e => e && typeof e.op === "string");
  if (!isNative) return null;

  const firstAlpha = effects.find(e => e && typeof e.α === "string")?.α
    || effects.find(e => e && typeof e.op === "string")?.op
    || intent?.alpha;
  if (!firstAlpha) return null;

  const α = OP_TO_ALPHA[firstAlpha] || firstAlpha;

  const userVisible = (normalizedParameters || []).filter(p => p && p.name !== "id");
  const TEXT_CONTROLS = new Set(["text", "email", "tel", "url", "string"]);

  if (α === "add") {
    // Zero user-params — plain click (rare, creator без ввода).
    if (userVisible.length === 0) return "click";
    // Single text-like param — composer / heroCreate friendly.
    if (userVisible.length === 1 && TEXT_CONTROLS.has(userVisible[0].type || "text")) {
      return "enter";
    }
    // Multi-param / non-text — formModal (catalog-creator-toolbar подхватит).
    return "form";
  }
  if (α === "remove") return "click";
  if (α === "replace") {
    return userVisible.length > 0 ? "form" : "click";
  }
  return null;
}

/**
 * Компилирует author-form precondition в canonical conditions:
 *   { "Order.status": ["pending"] }        → ["Order.status = 'pending'"]
 *   { "Order.status": ["pending","paid"] } → ["Order.status IN ('pending','paid')"]
 *   { "Order.status": "pending" }          → ["Order.status = 'pending'"]
 *   { "Book.archived": false }             → ["Book.archived = false"]
 *
 * LHS должен иметь форму `Entity.field` — совпадает с parser'ом в
 * evalIntentCondition. Нестрогие форматы (array/literal rhs) тихо
 * пропускаются: автор или просто забыл, или не знает.
 */
export function compilePreconditionToConditions(precondition) {
  if (!precondition || typeof precondition !== "object" || Array.isArray(precondition)) {
    return [];
  }
  const out = [];
  for (const [lhs, rhs] of Object.entries(precondition)) {
    if (!lhs || typeof lhs !== "string" || !lhs.includes(".")) continue;
    if (Array.isArray(rhs)) {
      const vals = rhs
        .filter(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
        .map(formatLiteral);
      if (vals.length === 0) continue;
      if (vals.length === 1) {
        out.push(`${lhs} = ${vals[0]}`);
      } else {
        out.push(`${lhs} IN (${vals.join(",")})`);
      }
    } else if (typeof rhs === "string") {
      out.push(`${lhs} = ${formatLiteral(rhs)}`);
    } else if (typeof rhs === "number" || typeof rhs === "boolean") {
      out.push(`${lhs} = ${rhs}`);
    } else if (rhs === null) {
      out.push(`${lhs} = null`);
    }
    // object-form { op, value } — TODO если понадобится
  }
  return out;
}

function formatLiteral(v) {
  if (typeof v === "string") return `'${v.replace(/'/g, "\\'")}'`;
  return String(v);
}

function dedupeStrings(arr) {
  return Array.from(new Set(arr));
}

export function normalizeIntentNative(intent) {
  if (!intent || typeof intent !== "object") return intent;

  const particles = intent.particles || {};
  let newParticles = particles;
  let particlesMutated = false;
  let intentMutated = false;
  const extraIntentPatch = {};

  // 1. particles.entities ← intent.target
  const existingEntities = Array.isArray(particles.entities) ? particles.entities : [];
  if (existingEntities.length === 0 && typeof intent.target === "string") {
    const t = intent.target.split(".")[0]; // "Task.status" → "Task"
    const alias = t[0].toLowerCase() + t.slice(1);
    newParticles = { ...newParticles, entities: [`${alias}: ${t}`] };
    particlesMutated = true;
  }

  // 2. particles.effects: op → α + target нормализация
  const effects = particles.effects;
  if (Array.isArray(effects) && effects.some(e => e && e.op && !e.α)) {
    newParticles = { ...newParticles, effects: effects.map(normalizeEffect) };
    particlesMutated = true;
  }

  // 2b. Синтезируем particles.effects из flat α+target (scaffold-path format).
  // Без этого deriveProjections видит mutators/creators пустыми и не триггерит
  // R1/R3. Применяется только если effects ещё не заданы author'ом.
  const alphaTop = typeof intent.α === "string" ? intent.α : typeof intent.alpha === "string" ? intent.alpha : null;
  const targetTop = typeof intent.target === "string" ? intent.target : null;
  const hasEffects = Array.isArray(newParticles.effects) && newParticles.effects.length > 0;
  if (alphaTop && targetTop && !hasEffects) {
    const op = alphaTop === "create" ? "create" : alphaTop === "remove" ? "remove" : "replace";
    newParticles = { ...newParticles, effects: [{ target: targetTop, op, α: op }] };
    particlesMutated = true;
  }

  // 2c. intent.creates ← entity из target для α:"create" (legacy-format hint).
  // deriveProjections.analyzeIntents читает creators как intent.creates.
  if (alphaTop === "create" && !intent.creates && targetTop) {
    extraIntentPatch.creates = targetTop.split(".")[0];
    intentMutated = true;
  }

  // 3. Parameters: object → array
  let newParameters = intent.parameters;
  if (newParameters && !Array.isArray(newParameters) && typeof newParameters === "object") {
    newParameters = normalizeParameters(newParameters);
  }

  // 4. Inferred confirmation для native intent'ов без неё.
  // Нужно после (3), чтобы count params корректно.
  const paramsForCount = Array.isArray(newParameters)
    ? newParameters
    : (Array.isArray(intent.parameters) ? intent.parameters : []);
  const inferredConf = inferConfirmation(intent, paramsForCount);
  if (inferredConf && !newParticles.confirmation) {
    newParticles = { ...newParticles, confirmation: inferredConf };
    particlesMutated = true;
  }

  // 5. intent.precondition (author-form, object-shape) → particles.conditions
  // (canonical string-form который ожидают buildItemConditions и
  // evalIntentCondition). Maps:
  //   { "Entity.field": "val" }         → "Entity.field = 'val'"
  //   { "Entity.field": ["v1"] }        → "Entity.field = 'v1'"
  //   { "Entity.field": ["v1","v2"] }   → "Entity.field IN ('v1','v2')"
  //   { "Entity.field": true/false/num } → "Entity.field = true"
  //
  // Добавляется К существующим particles.conditions, не заменяет — автор
  // может комбинировать высокоуровневое precondition с сырыми conditions.
  const compiled = compilePreconditionToConditions(intent.precondition);
  if (compiled.length > 0) {
    const existing = Array.isArray(newParticles.conditions) ? newParticles.conditions : [];
    const merged = dedupeStrings([...existing, ...compiled]);
    if (merged.length !== existing.length) {
      newParticles = { ...newParticles, conditions: merged };
      particlesMutated = true;
    }
  }

  if (!particlesMutated && newParameters === intent.parameters && !intentMutated) {
    return intent;
  }

  return {
    ...intent,
    ...extraIntentPatch,
    particles: newParticles,
    ...(newParameters !== intent.parameters ? { parameters: newParameters } : {}),
  };
}

/**
 * Normalize весь INTENTS-map. Идемпотентно: повторный вызов возвращает
 * тот же объект (референтная равенство).
 */
export function normalizeIntentsMap(INTENTS) {
  if (!INTENTS || typeof INTENTS !== "object") return INTENTS;
  const out = {};
  let mutated = false;
  for (const [id, intent] of Object.entries(INTENTS)) {
    const normalized = normalizeIntentNative(intent);
    if (normalized !== intent) mutated = true;
    out[id] = normalized;
  }
  return mutated ? out : INTENTS;
}
