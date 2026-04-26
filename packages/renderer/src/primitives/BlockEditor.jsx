/**
 * BlockEditor primitive — block-tree редактор для notion-style canvas'ов.
 *
 * Дизайн (§12.10 sdk-improvements-backlog): renderer не реализует богатый
 * editing самостоятельно — формат остаётся минимальным и format-coherent.
 * Вместо этого primitive резолвит реализацию через adapter capability:
 *
 *   adapter.capabilities.primitive.blockEditor = {
 *     kinds: ["paragraph", "heading-1", ..., "code", "image", "todo"],
 *     slashCommands: true,
 *     indent: true,
 *   };
 *   adapter.primitive.blockEditor = TipTapWrapper | BlockNoteWrapper | ...;
 *
 * Это сохраняет reader-симметрию (§23 axiom 5): voice / agent / document
 * материализуют block-tree из Φ напрямую через ontology + materializers,
 * pixels-reader делегирует визуализацию выбранной библиотеке.
 *
 * Если адаптер capability не декларирует — рендерится read-only
 * структурный список (заголовки + иерархия), без редактирования.
 *
 * Block shape (минимальный):
 *   { id, kind, content, parentId, order, props? }
 *
 * Props:
 *   - blocks: Block[]                    — плоский массив (иерархия через parentId)
 *   - onChange(nextBlocks): void         — полная замена списка
 *   - onSlashCommand(blockId, cmd): void — команда из slash-меню
 *   - onIndent(blockId): void / onOutdent(blockId): void
 *   - onKindChange(blockId, kind): void
 *   - readOnly?: boolean                 — read-only режим (default false)
 *   - placeholder?: string               — текст пустого состояния
 */

import { getAdaptedComponent, getCapability } from "../adapters/registry.js";

const KIND_LABELS = {
  paragraph: "P",
  "heading-1": "H1",
  "heading-2": "H2",
  "heading-3": "H3",
  "bulleted-list-item": "•",
  "numbered-list-item": "1.",
  "to-do": "☐",
  toggle: "▸",
  quote: "❝",
  callout: "ℹ",
  divider: "—",
  code: "</>",
  image: "🖼",
  bookmark: "🔖",
  embed: "⧉",
  child_page: "📄",
};

function buildHierarchy(blocks) {
  const byId = new Map();
  const roots = [];
  const sorted = (blocks || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sorted.forEach(b => byId.set(b.id, { ...b, children: [] }));
  byId.forEach(node => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function FallbackBlock({ node, depth = 0 }) {
  const label = KIND_LABELS[node.kind] || node.kind || "?";
  const isHeading = typeof node.kind === "string" && node.kind.startsWith("heading-");
  const isDivider = node.kind === "divider";
  if (isDivider) {
    return (
      <div style={{ marginLeft: depth * 20 }}>
        <hr style={{ border: 0, borderTop: "1px solid var(--idf-border, #e5e7eb)", margin: "12px 0" }} />
      </div>
    );
  }
  return (
    <>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        marginLeft: depth * 20,
        padding: "4px 0",
        fontSize: isHeading ? 18 : 14,
        fontWeight: isHeading ? 600 : 400,
        color: "var(--idf-text, #111827)",
      }}>
        <span style={{
          flexShrink: 0,
          width: 24,
          fontFamily: "var(--idf-font-mono, ui-monospace, monospace)",
          fontSize: 11,
          color: "var(--idf-text-muted, #6b7280)",
          textAlign: "center",
        }}>{label}</span>
        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {node.content || <span style={{ color: "var(--idf-text-muted, #9ca3af)", fontStyle: "italic" }}>пусто</span>}
        </span>
      </div>
      {(node.children || []).map(child => (
        <FallbackBlock key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function BlockEditorFallback({ blocks, placeholder = "Блоков нет" }) {
  const tree = buildHierarchy(blocks);
  if (tree.length === 0) {
    return (
      <div style={{
        padding: "24px 16px",
        color: "var(--idf-text-muted, #6b7280)",
        fontStyle: "italic",
        textAlign: "center",
      }}>{placeholder}</div>
    );
  }
  return (
    <div style={{
      fontFamily: "var(--idf-font, system-ui)",
      lineHeight: 1.5,
    }}>
      {tree.map(node => <FallbackBlock key={node.id} node={node} />)}
    </div>
  );
}

/**
 * Главный primitive. Резолвит adapter-component если декларирован,
 * иначе — read-only fallback.
 */
export default function BlockEditor(props) {
  const Adapted = getAdaptedComponent("primitive", "blockEditor");
  const cap = getCapability("primitive", "blockEditor");

  if (Adapted) {
    return <Adapted {...props} capability={cap} />;
  }

  return <BlockEditorFallback blocks={props.blocks} placeholder={props.placeholder} />;
}

export { BlockEditorFallback, buildHierarchy };
