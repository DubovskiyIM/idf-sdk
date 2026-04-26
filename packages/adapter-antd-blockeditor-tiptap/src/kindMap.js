/**
 * kindMap — преобразование между BlockEditor primitive contract и Tiptap-doc.
 *
 * BlockEditor оперирует canonical kind'ами (renderer §12.10):
 *   "paragraph" / "heading-1..3" / "bulleted-list-item" / "numbered-list-item" /
 *   "to-do" / "quote" / "code" / "divider" / "image" / "bookmark" / ...
 *
 * Tiptap StarterKit оперирует ProseMirror node-types:
 *   paragraph / heading (с attr level) / bulletList / orderedList /
 *   taskList (extension) / blockquote / codeBlock / horizontalRule / image
 *
 * Этот модуль — pure mapping без зависимости от tiptap; тестируется отдельно.
 */

export const KIND_TO_TIPTAP = {
  paragraph: { type: "paragraph" },
  "heading-1": { type: "heading", attrs: { level: 1 } },
  "heading-2": { type: "heading", attrs: { level: 2 } },
  "heading-3": { type: "heading", attrs: { level: 3 } },
  "bulleted-list-item": { type: "paragraph", wrap: "bulletList" },
  "numbered-list-item": { type: "paragraph", wrap: "orderedList" },
  "to-do": { type: "paragraph", wrap: "taskList" },
  quote: { type: "paragraph", wrap: "blockquote" },
  code: { type: "codeBlock" },
  divider: { type: "horizontalRule" },
};

export function tiptapNodeForKind(kind) {
  return KIND_TO_TIPTAP[kind] || KIND_TO_TIPTAP.paragraph;
}

/**
 * Построить Tiptap-doc JSON для одного блока.
 * Возвращает ProseMirror-style node-tree, который понимает
 * editor.commands.setContent(...).
 */
export function blockToTiptapDoc(block) {
  const { kind = "paragraph", content = "" } = block || {};
  const spec = tiptapNodeForKind(kind);

  if (spec.type === "horizontalRule") {
    return { type: "doc", content: [{ type: "horizontalRule" }] };
  }

  const text = String(content || "");
  const textNode = text.length > 0 ? [{ type: "text", text }] : [];

  if (spec.type === "codeBlock") {
    return { type: "doc", content: [{ type: "codeBlock", content: textNode }] };
  }

  if (spec.type === "heading") {
    return {
      type: "doc",
      content: [{ type: "heading", attrs: spec.attrs, content: textNode }],
    };
  }

  // paragraph (с возможной обёрткой)
  const para = { type: "paragraph", content: textNode };
  if (spec.wrap === "bulletList") {
    return {
      type: "doc",
      content: [{ type: "bulletList", content: [{ type: "listItem", content: [para] }] }],
    };
  }
  if (spec.wrap === "orderedList") {
    return {
      type: "doc",
      content: [{ type: "orderedList", content: [{ type: "listItem", content: [para] }] }],
    };
  }
  if (spec.wrap === "taskList") {
    return {
      type: "doc",
      content: [{
        type: "taskList",
        content: [{ type: "taskItem", attrs: { checked: !!block.props?.checked }, content: [para] }],
      }],
    };
  }
  if (spec.wrap === "blockquote") {
    return { type: "doc", content: [{ type: "blockquote", content: [para] }] };
  }

  return { type: "doc", content: [para] };
}

/**
 * Из Tiptap doc-JSON извлечь plain-text блока.
 * Сохраняет переводы строк (\n) между параграфами в codeBlock.
 * Markdown-инлайн (bold/italic/code) не теряется — Tiptap apply'ит как marks
 * на text-узлы; мы здесь возвращаем concatenated text content.
 *
 * Богатую сериализацию (HTML / markdown) пользователь может получить через
 * editor.getHTML() напрямую; для domain-shape (один text per block) plain-text
 * достаточно.
 */
export function tiptapDocToText(doc) {
  if (!doc || typeof doc !== "object") return "";
  const parts = [];
  function walk(node) {
    if (!node) return;
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }
  walk(doc);
  return parts.join("");
}

/**
 * Вытащить kind из Tiptap-doc JSON. Используется когда пользователь
 * меняет тип через bubble-menu внутри Tiptap (e.g. paragraph → heading).
 *
 * Возвращает canonical block kind или null если не распознаётся.
 */
export function tiptapDocToKind(doc) {
  const top = doc?.content?.[0];
  if (!top) return null;
  if (top.type === "horizontalRule") return "divider";
  if (top.type === "codeBlock") return "code";
  if (top.type === "blockquote") return "quote";
  if (top.type === "bulletList") return "bulleted-list-item";
  if (top.type === "orderedList") return "numbered-list-item";
  if (top.type === "taskList") return "to-do";
  if (top.type === "heading") {
    const lvl = top.attrs?.level;
    if (lvl === 1) return "heading-1";
    if (lvl === 2) return "heading-2";
    if (lvl === 3) return "heading-3";
    return "heading-1";
  }
  if (top.type === "paragraph") return "paragraph";
  return null;
}
