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

  if (α === "add") return "enter";
  if (α === "remove") return "click";
  if (α === "replace") {
    const userVisible = (normalizedParameters || []).filter(p => p && p.name !== "id");
    return userVisible.length > 0 ? "form" : "click";
  }
  return null;
}

export function normalizeIntentNative(intent) {
  if (!intent || typeof intent !== "object") return intent;

  const particles = intent.particles || {};
  let newParticles = particles;
  let particlesMutated = false;

  // 1. particles.entities ← intent.target
  const existingEntities = Array.isArray(particles.entities) ? particles.entities : [];
  if (existingEntities.length === 0 && typeof intent.target === "string") {
    const t = intent.target;
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

  if (!particlesMutated && newParameters === intent.parameters) {
    return intent;
  }

  return {
    ...intent,
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
