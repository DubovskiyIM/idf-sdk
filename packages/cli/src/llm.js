/**
 * Обёртка над Anthropic SDK для CLI-диалога.
 *
 * Архитектура:
 * - Один system prompt (содержит сжатую spec'у IDF) — кешируется через
 *   prompt caching (>90% скидка после первого запроса).
 * - Четыре под-промпта по шагам диалога: entities / roles / intents /
 *   (validate-fixup в будущем).
 * - Возвращает строго JSON через response_format (LLM инструктируется
 *   давать чистый JSON-объект, без markdown-обёртки).
 */
import Anthropic from "@anthropic-ai/sdk";

export const MODEL_IDS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
};

const SYSTEM_PROMPT = `Ты — ассистент по разметке доменов в парадигме Intent-Driven Frontend (IDF).

IDF-парадигма за 60 секунд:
- Состояние мира = fold(Φ_confirmed) — append-only поток подтверждённых эффектов.
- Намерение = id + частицы { entities, conditions, effects, witnesses, confirmation }.
- Эффект = { alpha: "add"|"replace"|"remove"|"batch", target, value }.
- Проекция = { id, mainEntity, archetype: "feed"|"catalog"|"detail"|"form"|"canvas"|"dashboard"|"wizard" }.
- Онтология = { entities: { Name: { kind, fields, ownerField } } }, kind ∈ "internal"|"reference"|"mirror"|"assignment".
- Роль имеет base ∈ "owner"|"viewer"|"agent"|"observer".

Семантические правила:
- Каждое поле сущности имеет: type (text|textarea|number|datetime|boolean|enum|id|entityRef),
  read [роли], write [роли], опц. fieldRole (money|percentage|trend|ticker|coordinate|address|zone).
- Намерение должно быть атомарным действием: одно семантическое изменение.
- Не предлагай meta-намерения вида "обновить" — нужны конкретные "set_status",
  "assign_to_user", "mark_completed", "submit_for_review" — каждое со своим набором эффектов.
- Имена в snake_case для intent.id, в PascalCase для entity.

Ты отвечаешь СТРОГО валидным JSON-объектом. Без markdown-блоков, без префиксов, без комментариев. Первый символ ответа — \`{\`, последний — \`}\`.`;

const PROMPTS = {
  entities: ({ name, description }) => `Домен: "${name}".
Описание автора: "${description}"

Предложи 3-7 ключевых сущностей (entities) этого домена. Для каждой:
- name: PascalCase
- kind: "internal" (по умолчанию) | "reference" (если это справочник)
- fields: массив имён полей (5-10 на сущность), без типов

Верни JSON:
{
  "entities": [
    { "name": "Order", "kind": "internal", "fields": ["id", "userId", "status", "total", "createdAt"] },
    ...
  ]
}`,

  roles: ({ name, description, entities }) => `Домен: "${name}".
Описание: "${description}"
Сущности: ${entities.map(e => e.name).join(", ")}

Предложи 1-4 роли. Для каждой:
- id: snake_case
- base: "owner" | "viewer" | "agent" | "observer"
- description: кратко зачем нужна

Верни JSON:
{
  "roles": [
    { "id": "user", "base": "owner", "description": "Авторизованный клиент, владеет своими заказами" },
    ...
  ]
}`,

  intents: ({ name, description, entities, roles }) => `Домен: "${name}".
Описание: "${description}"
Сущности: ${entities.map(e => `${e.name}(${e.fields.join(",")})`).join("; ")}
Роли: ${roles.map(r => r.id).join(", ")}

Выведи 8-15 атомарных намерений, покрывающих основной CRUD-цикл и бизнес-действия. Для каждого:
- id: snake_case (e.g. "create_order", "cancel_order", "mark_paid")
- title: короткое название по-русски
- entities: [имена затрагиваемых сущностей]
- effects: массив { alpha, target, value? } — где target = "EntityName" для add/remove или "EntityName.field" для replace
- requiredFor: [роли которые могут запускать]

Верни JSON:
{
  "intents": [
    {
      "id": "create_order",
      "title": "Создать заказ",
      "entities": ["Order"],
      "effects": [{ "alpha": "add", "target": "Order" }],
      "requiredFor": ["user"]
    },
    ...
  ]
}`,
};

export async function askLLM(modelKey, step, ctx) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const promptFn = PROMPTS[step];
  if (!promptFn) throw new Error(`Unknown LLM step: ${step}`);

  const response = await client.messages.create({
    model: MODEL_IDS[modelKey],
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      { role: "user", content: promptFn(ctx) },
    ],
  });

  const text = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();

  // Защита от обёрток ```json ... ```
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `LLM вернул не-JSON (шаг "${step}"). Первые 200 символов: ${cleaned.slice(0, 200)}`
    );
  }
}
