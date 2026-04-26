# @intent-driven/adapter-antd-blockeditor-tiptap

## 0.3.0

### Minor Changes

- 7b5b1dc: feat(blockeditor-tiptap): v0.2 — slash-commands + inline BubbleMenu

  Notion-style production UX поверх v0.1 reference impl:

  **Slash-commands menu** (`/`):

  - Реализован через `@tiptap/suggestion` extension + React popup (без tippy.js, чтобы избежать SSR-проблем — простой `createPortal` относительно client coords).
  - 10 опций: heading 1-3, paragraph, bullet/numbered list, to-do, quote, code, divider.
  - Filtering по label / kind / aliases (case-insensitive). Например `/h1` `/heading` `/title` все попадают в heading-1, `/todo` `/task` `/check` — в to-do.
  - Keyboard: ↑/↓ навигация, Enter — select, Escape — close.
  - При выборе: range-deletion `/` + query → emit `onKindChange(blockId, kind)` через extension storage.
  - Pure helpers `filterSlashOptions(query, options?)` + `SLASH_OPTIONS` экспортированы для тестов и кастомизации.

  **InlineBubbleMenu**:

  - `BubbleMenu` из `@tiptap/react/menus` над selection в paragraph/heading/list/blockquote (не показывается в codeBlock — там code-mark не работает).
  - 4 кнопки: Bold (B), Italic (I), Strike (S), Code (`</>`). Inline marks из StarterKit, никаких extra-extensions.
  - Стиль pure inline (без AntD Button) — bubble-menu остаётся лёгким и не дёргает theme.

  **Capability flags обновлены**:

  - `slashCommands: false → true`
  - `inlineFormatting: true` (был и в v0.1, теперь подкреплён UI)
  - `indent: false`, `dragHandles: false` остаются (BlockNote upgrade-path для v0.3).

  **Зависимости (новые)**:

  - `@tiptap/core` ^3.7 (для `Extension.create`)
  - `@tiptap/suggestion` ^3.7 (для slash-trigger)

  **Тесты:** 44 (было 27): kindMap 20, applyTiptapBlockEditor 7, **SlashMenu 17 новых** (filterSlashOptions edge-cases + SlashMenuPopup show/update/hide + keyboard ArrowDown/Enter/Escape + filtered-empty no-op).

  Backwards-compatible: existing `applyTiptapBlockEditor(adapter)` API не изменился, host-wrapper'ам менять ничего не нужно.

## 0.2.0

### Minor Changes

- 56ca8e0: feat: новый пакет — Tiptap-backed BlockEditor для antd-адаптера (§12.10)

  Опциональный upgrade поверх reference textarea-impl в `@intent-driven/adapter-antd@1.5+`. Подключается одной строчкой:

  ```js
  applyTiptapBlockEditor(antdAdapter);
  ```

  После этого `adapter.primitive.blockEditor` рендерится через Tiptap StarterKit (rich-text inline-formatting bold/italic/code, родная обработка paragraph/heading-1..3/lists/quote/codeBlock/hr), а `adapter.capabilities.primitive.blockEditor.inlineFormatting` переключается с `false` на `true`.

  Архитектура v0.1: per-block Tiptap editor instance с AntD Select для kind. Slash-commands / drag-handles / indent — v0.2 (BlockNote upgrade-path). Соответствует BlockEditor primitive contract'у из `@intent-driven/renderer` (§12.10): blocks/onChange/onKindChange/readOnly прокидываются как есть — host wrappers'ам менять ничего не нужно.

  27 unit-тестов на kindMap (block↔Tiptap doc bidirectional) и applyTiptapBlockEditor (capability mutation idempotence).

  License MIT, peer deps: react ≥18, react-dom ≥18, antd ≥5, @intent-driven/adapter-antd ≥1.5; runtime deps: @tiptap/react / @tiptap/pm / @tiptap/starter-kit ≥3.7.
