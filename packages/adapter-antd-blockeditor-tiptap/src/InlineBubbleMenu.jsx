/**
 * InlineBubbleMenu — bubble-menu над selection для inline-formatting:
 * Bold / Italic / Code / Strike. Открывается когда selection непустой
 * (Tiptap BubbleMenu пакет управляет visibility).
 *
 * Без AntD-button (на bubble-menu Button-ы тяжелы и дёргают theme); используем
 * простые tooltip-style кнопки со стилями inline. Иконки — unicode glyphs,
 * чтобы не тащить @ant-design/icons.
 */

import React from "react";
import { BubbleMenu } from "@tiptap/react/menus";

const BTN_STYLE = {
  background: "transparent",
  border: "none",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--idf-font, system-ui)",
  color: "var(--idf-text, #111827)",
  borderRadius: 3,
};

const ACTIVE_STYLE = {
  background: "rgba(99, 102, 241, 0.15)",
  color: "#6366f1",
};

function MarkButton({ isActive, onMouseDown, label, title, monospace }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      style={{
        ...BTN_STYLE,
        ...(isActive ? ACTIVE_STYLE : {}),
        fontFamily: monospace ? "ui-monospace, monospace" : BTN_STYLE.fontFamily,
        fontWeight: title === "Bold" ? 700 : 400,
        fontStyle: title === "Italic" ? "italic" : "normal",
        textDecoration: title === "Strike" ? "line-through" : "none",
      }}
    >{label}</button>
  );
}

export default function InlineBubbleMenu({ editor }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={({ editor: ed, from, to }) => {
        if (!ed.isEditable) return false;
        if (from === to) return false; // empty selection
        // Не показывать в codeBlock (там code-mark не имеет смысла)
        if (ed.isActive("codeBlock")) return false;
        return true;
      }}
    >
      <div style={{
        display: "flex",
        gap: 2,
        background: "var(--idf-surface, #fff)",
        border: "1px solid var(--idf-border, #d9d9d9)",
        borderRadius: 6,
        padding: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
      }}>
        <MarkButton
          isActive={editor.isActive("bold")}
          onMouseDown={() => editor.chain().focus().toggleBold().run()}
          label="B"
          title="Bold"
        />
        <MarkButton
          isActive={editor.isActive("italic")}
          onMouseDown={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          title="Italic"
        />
        <MarkButton
          isActive={editor.isActive("strike")}
          onMouseDown={() => editor.chain().focus().toggleStrike().run()}
          label="S"
          title="Strike"
        />
        <MarkButton
          isActive={editor.isActive("code")}
          onMouseDown={() => editor.chain().focus().toggleCode().run()}
          label="</>"
          title="Code"
          monospace
        />
      </div>
    </BubbleMenu>
  );
}
