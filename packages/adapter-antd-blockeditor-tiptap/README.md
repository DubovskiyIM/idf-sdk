# @intent-driven/adapter-antd-blockeditor-tiptap

Tiptap-backed `BlockEditor` primitive для [`@intent-driven/adapter-antd`](https://www.npmjs.com/package/@intent-driven/adapter-antd). Опциональный upgrade поверх reference textarea-impl: rich-text inline-formatting (bold / italic / code) через ProseMirror StarterKit, родная Tiptap-обработка структурных kind'ов (paragraph / heading 1–3 / lists / quote / code / hr).

Закрывает SDK backlog §12.10 P0 (Notion field-test BlockEditor primitive) для production-style UX. Slash-commands и drag-handles — v0.2 (BlockNote upgrade-path).

## Установка

```bash
npm install @intent-driven/adapter-antd-blockeditor-tiptap
# peer deps уже стоят: react, react-dom, antd, @intent-driven/adapter-antd
```

## Использование

```jsx
import { antdAdapter } from "@intent-driven/adapter-antd";
import { registerUIAdapter } from "@intent-driven/renderer";
import { applyTiptapBlockEditor } from "@intent-driven/adapter-antd-blockeditor-tiptap";

applyTiptapBlockEditor(antdAdapter);
registerUIAdapter(antdAdapter);
```

`applyTiptapBlockEditor()` mutating заменяет `adapter.primitive.blockEditor` и обновляет `adapter.capabilities.primitive.blockEditor` descriptor:

```js
{
  kinds: ["paragraph", "heading-1..3", "bulleted-list-item",
          "numbered-list-item", "to-do", "quote", "code", "divider"],
  slashCommands: false,
  indent: false,
  dragHandles: false,
  inlineFormatting: true,
}
```

Вызывающему коду (host wrapper, e.g. notion `BlockCanvas` через `<BlockEditor>` из `@intent-driven/renderer`) ничего менять не нужно — primitive получит блоки в том же contract'е (`blocks` / `onChange` / `onKindChange` / `readOnly`).

## Архитектура (v0.1)

- **Per-block Tiptap editor instance.** Один блок ↔ один ProseMirror. Прозрачное reverse-mapping (text/kind/checked) и stable IDs из domain. Trade-off: нет «слитного» selection через границу блока, нет автоматической slice-операции через несколько блоков.
- **AntD `Select` over each block** — kind transition (paragraph → heading-2, и т. п.).
- **StarterKit-only extensions** — paragraph, heading 1–3, bulletList, orderedList, taskList, blockquote, codeBlock, horizontalRule, hardBreak. Inline marks: bold, italic, code, strike.
- **Реактивный sync** через `useEffect`: если родитель сменил `block.content` извне (другой пользователь/agent через intent), editor `setContent` без `emitUpdate`.

## Roadmap (v0.2+)

| Фича | Статус | Dependency |
|---|---|---|
| Slash-commands menu | TODO | `@tiptap/suggestion` или BlockNote |
| Drag-handles & block-reorder | TODO | BlockNote или custom NodeView |
| Indent / outdent | TODO | tree-aware editor (BlockNote) |
| Image / bookmark blocks | TODO | `@tiptap/extension-image` + uploader contract |
| Bubble-menu для inline-formatting | планируется | `@tiptap/react` `BubbleMenu` |

## Reader-симметрия

Соответствует §23 axiom 5 манифеста IDF: voice / agent-API / document материализаторы читают block-tree из Φ напрямую через ontology+materializers, pixels-reader (этот пакет) делегирует rich-text визуализацию Tiptap'у. Renderer-bundle не растёт на размер ProseMirror — потребитель устанавливает пакет только если ему нужен этот UX.

## License

MIT
