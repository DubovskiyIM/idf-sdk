---
"@intent-driven/adapter-antd-blockeditor-tiptap": minor
---

feat(blockeditor-tiptap): v0.2 — slash-commands + inline BubbleMenu

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
