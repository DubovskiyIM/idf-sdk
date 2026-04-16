export function render(ctx) {
  const { name, description, entities, roles, intents } = ctx;

  const entitiesTable = entities.map(e =>
    `| \`${e.name}\` | ${e.kind || "internal"} | ${e.fields.join(", ")} |`
  ).join("\n");

  const rolesTable = roles.map(r =>
    `| \`${r.id}\` | ${r.base} | ${r.description} |`
  ).join("\n");

  const intentsList = intents.map(i =>
    `- **\`${i.id}\`** — ${i.title}`
  ).join("\n");

  return `# ${name}

${description}

Сгенерирован [@intent-driven/cli](https://www.npmjs.com/package/@intent-driven/cli) на основе LLM-диалога.

## Структура

\`\`\`
${name}/
  domain.js           — ontology + intents + projections
  seed.js             — стартовый мир для smoke-тестов
  test/
    crystallize.test.js  — прогон crystallize_v2
\`\`\`

## Сущности

| Имя | Kind | Поля |
|---|---|---|
${entitiesTable}

## Роли

| ID | Base | Описание |
|---|---|---|
${rolesTable}

## Намерения (${intents.length})

${intentsList}

## Запуск

\`\`\`bash
npm install
npm test
\`\`\`

## Подключение к прототипу IDF

1. Скопируй каталог в \`src/domains/${name}/\` целевого репо.
2. Зарегистрируй в \`src/prototype.jsx\` как новый пункт переключателя:
   \`\`\`js
   import ${name}Domain from "./domains/${name}/domain.js";
   import ${name}Seed from "./domains/${name}/seed.js";
   // … добавить в DOMAINS map
   \`\`\`
3. Запусти \`npm run dev\`.

## Что дальше

Этот домен — стартовая точка. Уточняй namedентов и проекций по мере того,
как формализуешь действия пользователя. Каждое новое намерение —
\`@intent-driven/cli add intent <name>\` (планируется в v0.2).
`;
}
