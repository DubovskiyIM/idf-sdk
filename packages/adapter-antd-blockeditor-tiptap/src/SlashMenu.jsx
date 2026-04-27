/**
 * SlashMenu — popup списка block-kind'ов, открывается на ввод "/" внутри
 * Tiptap-блока. Позиционируется по DOM-rect cursor'а через client coords.
 *
 * Архитектура:
 *   - SlashCommandExtension (Extension via @tiptap/suggestion) ловит "/" + слово
 *   - Render-callback проброшен ref'ом: на open → setCoords + setQuery + show;
 *     на keyDown ↑/↓/Enter → менять active idx или select; on Escape → hide.
 *   - При select: убираем "/" + query из ProseMirror (через range.deleteRange),
 *     emit'ем onKindChange(blockId, kind) через editor.storage.slashMenu callback.
 *
 * Без tippy.js / react-tippy (вызывает SSR-проблемы); используем простой
 * React portal с absolute-position относительно client coords. AntD не нужен
 * для popup'а — простой div со стилями (но используем те же CSS-vars).
 */

import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";

const SLASH_OPTIONS = [
  { kind: "heading-1", label: "Heading 1", aliases: ["h1", "title"], hint: "/h1" },
  { kind: "heading-2", label: "Heading 2", aliases: ["h2"], hint: "/h2" },
  { kind: "heading-3", label: "Heading 3", aliases: ["h3"], hint: "/h3" },
  { kind: "paragraph", label: "Paragraph", aliases: ["p", "text"], hint: "/p" },
  { kind: "bulleted-list-item", label: "Bullet list", aliases: ["bullet", "ul"], hint: "/bullet" },
  { kind: "numbered-list-item", label: "Numbered list", aliases: ["number", "ol"], hint: "/number" },
  { kind: "to-do", label: "To-do", aliases: ["todo", "task", "check"], hint: "/todo" },
  { kind: "quote", label: "Quote", aliases: ["blockquote"], hint: "/quote" },
  { kind: "code", label: "Code block", aliases: ["code"], hint: "/code" },
  { kind: "divider", label: "Divider", aliases: ["hr", "rule", "separator"], hint: "/hr" },
];

export { SLASH_OPTIONS };

/**
 * Pure filter — экспонируем для тестов.
 */
export function filterSlashOptions(query, options = SLASH_OPTIONS) {
  if (!query) return options;
  const q = query.toLowerCase();
  return options.filter(o =>
    o.label.toLowerCase().includes(q) ||
    o.kind.toLowerCase().includes(q) ||
    o.aliases.some(a => a.includes(q))
  );
}

/**
 * SlashMenuPopup — внутренний компонент. Управление открытием через ref:
 *   const ref = useRef();
 *   ref.current.show({ x, y, query, onSelect, onClose });
 *   ref.current.update({ query });
 *   ref.current.hide();
 *   ref.current.handleKeyDown(event); // → boolean (handled?)
 */
export const SlashMenuPopup = forwardRef(function SlashMenuPopup(_props, ref) {
  const [state, setState] = useState({ visible: false, x: 0, y: 0, query: "", onSelect: null, activeIdx: 0 });

  useImperativeHandle(ref, () => ({
    show({ x, y, query, onSelect }) {
      setState({ visible: true, x, y, query: query || "", onSelect, activeIdx: 0 });
    },
    update({ query }) {
      setState(s => ({ ...s, query: query || "", activeIdx: 0 }));
    },
    hide() {
      setState(s => ({ ...s, visible: false, onSelect: null }));
    },
    handleKeyDown(event) {
      // Возвращает true, если обработали (host editor должен пропустить).
      if (!state.visible) return false;
      const filtered = filterSlashOptions(state.query);
      if (filtered.length === 0) return false;
      if (event.key === "ArrowDown") {
        setState(s => ({ ...s, activeIdx: (s.activeIdx + 1) % filtered.length }));
        return true;
      }
      if (event.key === "ArrowUp") {
        setState(s => ({ ...s, activeIdx: (s.activeIdx - 1 + filtered.length) % filtered.length }));
        return true;
      }
      if (event.key === "Enter") {
        const opt = filtered[state.activeIdx];
        if (opt && state.onSelect) state.onSelect(opt.kind);
        setState(s => ({ ...s, visible: false, onSelect: null }));
        return true;
      }
      if (event.key === "Escape") {
        setState(s => ({ ...s, visible: false, onSelect: null }));
        return true;
      }
      return false;
    },
  }), [state]);

  if (!state.visible) return null;
  if (typeof document === "undefined") return null;

  const filtered = filterSlashOptions(state.query);
  if (filtered.length === 0) return null;

  return createPortal(
    <div
      role="menu"
      aria-label="Slash commands"
      style={{
        position: "fixed",
        top: state.y + 4,
        left: state.x,
        zIndex: 1100,
        background: "var(--idf-surface, #fff)",
        border: "1px solid var(--idf-border, #d9d9d9)",
        borderRadius: 6,
        boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
        minWidth: 220,
        maxWidth: 320,
        maxHeight: 300,
        overflowY: "auto",
        fontFamily: "var(--idf-font, system-ui)",
        fontSize: 13,
      }}
    >
      {filtered.map((opt, i) => (
        <div
          key={opt.kind}
          role="menuitem"
          tabIndex={-1}
          onMouseEnter={() => setState(s => ({ ...s, activeIdx: i }))}
          onMouseDown={(e) => {
            e.preventDefault();
            if (state.onSelect) state.onSelect(opt.kind);
            setState(s => ({ ...s, visible: false, onSelect: null }));
          }}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            cursor: "pointer",
            background: i === state.activeIdx ? "rgba(99, 102, 241, 0.10)" : "transparent",
            borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <span style={{ fontWeight: 500 }}>{opt.label}</span>
          <span style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: "var(--idf-text-muted, #6b7280)",
            marginLeft: 12,
          }}>{opt.hint}</span>
        </div>
      ))}
    </div>,
    document.body
  );
});
