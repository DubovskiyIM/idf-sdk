/**
 * TiptapBlockEditor — Tiptap-backed реализация BlockEditor primitive
 * для @intent-driven/adapter-antd. Подключается через
 * `applyTiptapBlockEditor(antdAdapter)` (см. ./index.js).
 *
 * Архитектура (v0.2):
 *   - Per-block Tiptap editor instance (один блок ↔ один ProseMirror).
 *     Прозрачное reverse-mapping (text/kind/checked) и stable IDs из domain.
 *     Trade-off: нет «слитного» selection через границу блока, нет
 *     автоматической слайс-операции через несколько блоков. Drag-handles
 *     и indent — отложены (BlockNote upgrade-path).
 *   - InlineBubbleMenu (StarterKit) даёт inline-formatting (bold / italic /
 *     strike / code) на любом непустом selection.
 *   - SlashMenuPopup (через @tiptap/suggestion) открывается на ввод "/" и
 *     эмитит onKindChange(blockId, kind) при выборе.
 *   - Kind-toolbar (AntD Select) над блоком — fallback для пользователей,
 *     которые не нашли slash-меню.
 *   - Capability declaration: `slashCommands: true`, `inlineFormatting: true`,
 *     `indent: false`, `dragHandles: false`.
 */

import { useMemo, useEffect, useRef } from "react";
import { Select } from "antd";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  blockToTiptapDoc,
  tiptapDocToText,
  tiptapDocToKind,
} from "./kindMap.js";
import { SlashMenuPopup } from "./SlashMenu.jsx";
import { createSlashCommandExtension } from "./slashCommandExtension.js";
import InlineBubbleMenu from "./InlineBubbleMenu.jsx";

const KIND_OPTIONS = [
  { value: "paragraph", label: "P" },
  { value: "heading-1", label: "H1" },
  { value: "heading-2", label: "H2" },
  { value: "heading-3", label: "H3" },
  { value: "bulleted-list-item", label: "•" },
  { value: "numbered-list-item", label: "1." },
  { value: "to-do", label: "☐" },
  { value: "quote", label: "❝" },
  { value: "code", label: "</>" },
  { value: "divider", label: "—" },
];

function TiptapSingleBlock({ block, readOnly, onChange, onKindChange }) {
  const initialDoc = useMemo(() => blockToTiptapDoc(block), [block.id]);
  const lastEmittedTextRef = useRef(block.content || "");
  const popupRef = useRef(null);

  // Slash-extension с замыканиями на popupRef.current. Оставляем onKindChange
  // и blockId через ref'ы — extension создаётся один раз на mount, props
  // могут меняться.
  const onKindChangeRef = useRef(onKindChange);
  onKindChangeRef.current = onKindChange;
  const blockIdRef = useRef(block.id);
  blockIdRef.current = block.id;

  const slashExtension = useMemo(() => createSlashCommandExtension({
    onShow: ({ x, y, query, selectItem }) => {
      popupRef.current?.show({ x, y, query, onSelect: (kind) => {
        selectItem(kind);
        // selectItem дернёт extension.command → onCommand(kind) ниже
      }});
    },
    onUpdate: ({ query, x, y }) => {
      popupRef.current?.update({ query, x, y });
    },
    onHide: () => {
      popupRef.current?.hide();
    },
    onKeyDown: (event) => {
      return popupRef.current?.handleKeyDown(event) === true;
    },
    onCommand: (kind) => {
      const cb = onKindChangeRef.current;
      if (cb) cb(blockIdRef.current, kind);
    },
  }), []);

  const editor = useEditor({
    extensions: [StarterKit.configure({}), slashExtension],
    content: initialDoc,
    editable: !readOnly,
    onUpdate({ editor }) {
      const doc = editor.getJSON();
      const nextText = tiptapDocToText(doc);
      const nextKind = tiptapDocToKind(doc);

      if (nextText !== lastEmittedTextRef.current) {
        lastEmittedTextRef.current = nextText;
        onChange?.(block.id, { content: nextText });
      }
      if (nextKind && nextKind !== block.kind) {
        onKindChange?.(block.id, nextKind);
      }
    },
  });

  // Изменение editable на лету (readOnly toggle).
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Если родитель сменил block.content извне (другой пользователь/правка
  // через intent), синхронизируем.
  useEffect(() => {
    if (!editor) return;
    const incoming = block.content || "";
    if (incoming !== lastEmittedTextRef.current) {
      lastEmittedTextRef.current = incoming;
      editor.commands.setContent(blockToTiptapDoc(block), { emitUpdate: false });
    }
  }, [editor, block.content, block.kind]);

  if (block.kind === "divider") {
    return <hr style={{ border: 0, borderTop: "1px solid var(--idf-border, #d9d9d9)", margin: "12px 0" }} />;
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      padding: "4px 0",
    }}>
      <Select
        size="small"
        value={block.kind || "paragraph"}
        disabled={readOnly}
        onChange={(next) => onKindChange?.(block.id, next)}
        options={KIND_OPTIONS}
        style={{ width: 80, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }} className="idf-tiptap-block">
        <EditorContent editor={editor} />
        <InlineBubbleMenu editor={editor} />
        <SlashMenuPopup ref={popupRef} />
      </div>
    </div>
  );
}

export default function TiptapBlockEditor({
  blocks = [],
  readOnly = false,
  onChange,
  onKindChange,
  placeholder = "Блоков нет",
}) {
  const sorted = useMemo(
    () => (blocks || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [blocks]
  );

  if (sorted.length === 0) {
    return (
      <div style={{
        padding: "24px 16px",
        color: "rgba(0,0,0,0.45)",
        fontStyle: "italic",
        textAlign: "center",
      }}>{placeholder}</div>
    );
  }

  return (
    <div className="idf-tiptap-blockeditor" style={{ fontFamily: "var(--idf-font, system-ui)" }}>
      {sorted.map(block => (
        <TiptapSingleBlock
          key={block.id}
          block={block}
          readOnly={readOnly}
          onChange={onChange}
          onKindChange={onKindChange}
        />
      ))}
    </div>
  );
}

/**
 * Capability descriptor для adapter.capabilities.primitive.blockEditor.
 * Применяется через applyTiptapBlockEditor() — не требуется напрямую.
 */
export const TIPTAP_CAPABILITY = {
  kinds: KIND_OPTIONS.map(o => o.value),
  slashCommands: true,    // v0.2 — через @tiptap/suggestion + SlashMenuPopup
  indent: false,
  dragHandles: false,
  inlineFormatting: true, // bold/italic/strike/code через InlineBubbleMenu
};
