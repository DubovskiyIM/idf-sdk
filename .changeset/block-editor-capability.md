---
"@intent-driven/renderer": minor
"@intent-driven/adapter-antd": minor
---

feat(blockeditor): primitive `BlockEditor` через adapter capability (§12.10)

Закрывает SDK backlog §12.10 (Notion field-test). Renderer экспортирует
`<BlockEditor>` primitive, который резолвит реализацию через
`adapter.capabilities.primitive.blockEditor`. Если адаптер декларирует
capability + регистрирует `primitive.blockEditor` — рендерится adapter-component
(passing through `blocks`, `onChange`, `onSlashCommand`, `onIndent`,
`onOutdent`, `onKindChange`, `readOnly`, `capability`). Иначе — read-only
структурный fallback (заголовки + иерархия, без редактирования).

`adapter-antd` декларирует reference impl: textarea per block + Select для kind,
`kinds: ["paragraph","heading-1..3","bulleted/numbered-list-item","to-do",
"quote","callout","divider","code"]`, `slashCommands/indent/dragHandles/
inlineFormatting: false`. Это намеренный минимум — для полноценного UX
host регистрирует Tiptap/BlockNote/Lexical-обёртку с тем же contract'ом.

Дизайн сохраняет reader-симметрию (§23 axiom 5): voice/agent/document
материализуют block-tree из Φ через ontology, pixels-reader делегирует
визуализацию выбранной библиотеке. Renderer-bundle не растёт на размер
editor-зависимостей.
