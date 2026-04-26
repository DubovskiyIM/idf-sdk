# @intent-driven/adapter-antd-blockeditor-tiptap

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
