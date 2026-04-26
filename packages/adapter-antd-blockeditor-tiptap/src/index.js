/**
 * @intent-driven/adapter-antd-blockeditor-tiptap
 *
 * Опциональный upgrade для @intent-driven/adapter-antd: заменяет reference
 * textarea-based BlockEditor на Tiptap-backed (rich-text inline-formatting,
 * ProseMirror schema). Подключается mutating adapter в bootstrap'е приложения:
 *
 *   import { antdAdapter, registerUIAdapter } from "@intent-driven/adapter-antd";
 *   import { applyTiptapBlockEditor } from "@intent-driven/adapter-antd-blockeditor-tiptap";
 *
 *   applyTiptapBlockEditor(antdAdapter);
 *   registerUIAdapter(antdAdapter);
 *
 * Это полностью совместимо с BlockEditor primitive contract'ом из
 * @intent-driven/renderer (§12.10): blocks/onChange/onKindChange/readOnly
 * прокидываются как есть. Вызывающему коду (host wrapper, e.g. notion
 * BlockCanvas) ничего менять не нужно — capability declaration
 * автоматически переключается с textarea-impl flags (slashCommands=false /
 * indent=false / dragHandles=false / inlineFormatting=false) на
 * tiptap-impl flags (..., inlineFormatting=true).
 */

import TiptapBlockEditor, { TIPTAP_CAPABILITY } from "./TiptapBlockEditor.jsx";

export { default as TiptapBlockEditor, TIPTAP_CAPABILITY } from "./TiptapBlockEditor.jsx";
export {
  KIND_TO_TIPTAP,
  tiptapNodeForKind,
  blockToTiptapDoc,
  tiptapDocToText,
  tiptapDocToKind,
} from "./kindMap.js";
export {
  SlashMenuPopup,
  SLASH_OPTIONS,
  filterSlashOptions,
} from "./SlashMenu.jsx";
export { createSlashCommandExtension } from "./slashCommandExtension.js";
export { default as InlineBubbleMenu } from "./InlineBubbleMenu.jsx";

/**
 * Mutates `adapter` (антд-адаптер) — заменяет primitive.blockEditor на
 * Tiptap-impl и обновляет capabilities.primitive.blockEditor descriptor.
 * Идемпотентно: повторный вызов не ломает состояние.
 */
export function applyTiptapBlockEditor(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("applyTiptapBlockEditor: adapter must be an object");
  }
  if (!adapter.primitive || typeof adapter.primitive !== "object") {
    adapter.primitive = {};
  }
  if (!adapter.capabilities || typeof adapter.capabilities !== "object") {
    adapter.capabilities = {};
  }
  if (!adapter.capabilities.primitive || typeof adapter.capabilities.primitive !== "object") {
    adapter.capabilities.primitive = {};
  }

  adapter.primitive.blockEditor = TiptapBlockEditor;
  adapter.capabilities.primitive.blockEditor = { ...TIPTAP_CAPABILITY };

  return adapter;
}
