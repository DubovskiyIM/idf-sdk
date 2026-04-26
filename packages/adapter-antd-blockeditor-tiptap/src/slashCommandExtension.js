/**
 * SlashCommandExtension — Tiptap-extension через @tiptap/suggestion.
 * Триггер: ввод "/" в начале блока (или в любом месте параграфа).
 *
 * При open/update/hide/keydown зовёт callbacks из extension options:
 *   - onShow({ x, y, query }) → React popup делает .show(...)
 *   - onUpdate({ query })      → React popup делает .update({ query })
 *   - onHide()                 → popup .hide()
 *   - onKeyDown(event)         → return boolean (handled? skip default)
 *
 * Селект kind'а:
 *   - Снаружи (popup → onSelect callback) editor.commands.deleteRange(range)
 *     убирает "/" + query, затем emit onKindChange(blockId, kind) через
 *     editor.storage.slashMenu (опции extension хранят ref на blockId).
 *
 * Работает per-block: каждый TiptapSingleBlock имеет свой editor instance
 * с эмбедденым extension'ом, конфигурированным под этот block.id.
 */

import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

export function createSlashCommandExtension({ onShow, onUpdate, onHide, onKeyDown, onCommand } = {}) {
  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          allowSpaces: false,
          command: ({ editor, range, props }) => {
            // props = { kind } — пришло из popup'а через .selectItem()
            editor.chain().focus().deleteRange(range).run();
            if (onCommand) onCommand(props.kind);
          },
          render: () => {
            return {
              onStart: (props) => {
                const rect = props.clientRect?.();
                if (rect && onShow) {
                  onShow({
                    x: rect.left,
                    y: rect.bottom,
                    query: props.query,
                    selectItem: (kind) => props.command({ kind }),
                  });
                }
              },
              onUpdate: (props) => {
                const rect = props.clientRect?.();
                if (onUpdate) onUpdate({ query: props.query, x: rect?.left, y: rect?.bottom });
              },
              onKeyDown: (props) => {
                if (onKeyDown) return onKeyDown(props.event);
                return false;
              },
              onExit: () => {
                if (onHide) onHide();
              },
            };
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
