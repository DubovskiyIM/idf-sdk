/**
 * Шаблон domain.js — экспорт { ontology, intents, projections } для прототипа IDF.
 * Сгенерирован `idf init` на основе LLM-диалога и валидирован crystallize_v2.
 */
export function render(ctx) {
  const { name, description, entities, roles, intents } = ctx;

  const ontology = renderOntology(entities, roles);
  const intentsBlock = renderIntents(intents);
  const projections = renderProjections(entities);

  return `/**
 * Домен "${name}" — ${description}
 *
 * Сгенерирован @intent-driven/cli. Подключение к прототипу IDF:
 *   1. Скопировать каталог в src/domains/${name}/
 *   2. Зарегистрировать в src/prototype.jsx как новый пункт переключателя
 *   3. Запустить npm run dev
 */

export const ontology = ${ontology};

export const intents = ${intentsBlock};

export const projections = ${projections};

export default { ontology, intents, projections };
`;
}

function renderOntology(entities, roles) {
  const entitiesObj = {};
  for (const e of entities) {
    const fields = {};
    for (const f of e.fields) {
      fields[f] = inferFieldSpec(f);
    }
    entitiesObj[e.name] = {
      kind: e.kind || "internal",
      fields,
      ownerField: pickOwnerField(e.fields),
    };
  }
  const rolesObj = {};
  for (const r of roles) {
    rolesObj[r.id] = { base: r.base, description: r.description };
  }
  return JSON.stringify({ entities: entitiesObj, roles: rolesObj }, null, 2);
}

function inferFieldSpec(name) {
  const lower = name.toLowerCase();
  if (lower === "id") return { type: "id", read: ["*"], write: [] };
  // Boolean раньше id-эвристики: isPaid, isActive, hasFoo не должны ловиться endsWith("id").
  if (lower.startsWith("is") || lower.startsWith("has") || lower.includes("active") || lower.includes("enabled")) {
    return { type: "boolean", read: ["*"], write: ["self"] };
  }
  if (lower.endsWith("at") || lower.includes("date")) return { type: "datetime", read: ["*"], write: ["self"] };
  if (lower.endsWith("id")) return { type: "entityRef", read: ["*"], write: ["self"] };
  if (lower.includes("amount") || lower.includes("total") || lower.includes("price")) {
    return { type: "number", read: ["*"], write: ["self"], fieldRole: "money" };
  }
  if (lower.includes("status") || lower.includes("type") || lower.includes("kind")) {
    return { type: "enum", read: ["*"], write: ["self"] };
  }
  if (lower.includes("description") || lower.includes("comment") || lower.includes("notes")) {
    return { type: "textarea", read: ["*"], write: ["self"] };
  }
  if (lower.includes("count") || lower.includes("quantity") || lower.includes("number")) {
    return { type: "number", read: ["*"], write: ["self"] };
  }
  return { type: "text", read: ["*"], write: ["self"] };
}

function pickOwnerField(fields) {
  const candidates = ["userId", "ownerId", "creatorId", "authorId"];
  return candidates.find(c => fields.includes(c)) || null;
}

function renderIntents(intents) {
  // crystallizeV2 ожидает map id→intent, не массив.
  const map = {};
  for (const i of intents) {
    map[i.id] = {
      id: i.id,
      title: i.title,
      particles: {
        entities: i.entities,
        effects: i.effects || [],
        confirmation: { type: "inline" },
      },
      requiredFor: i.requiredFor || ["*"],
    };
  }
  return JSON.stringify(map, null, 2);
}

function renderProjections(entities) {
  // Минимальный набор: catalog + detail для каждой не-reference entity.
  // crystallizeV2 ожидает map id→projection, поле архетипа называется `kind`.
  const map = {};
  for (const e of entities) {
    if (e.kind === "reference") continue;
    const lowerPlural = e.name[0].toLowerCase() + e.name.slice(1) + "s";
    map[`${lowerPlural}_list`] = {
      id: `${lowerPlural}_list`,
      name: `Список ${e.name}`,
      mainEntity: e.name,
      kind: "catalog",
    };
    map[`${lowerPlural}_detail`] = {
      id: `${lowerPlural}_detail`,
      name: `${e.name} — детали`,
      mainEntity: e.name,
      kind: "detail",
      idParam: "id",
    };
  }
  return JSON.stringify(map, null, 2);
}
