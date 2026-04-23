import { useState, useCallback } from "react";

/**
 * AdminShell — 2-column layout с persistent sidebar tree и body,
 * переключаемым через onSelect. Закрывает G-K-14 (Keycloak dogfood):
 * admin-style enterprise UX (Keycloak / Gravitino / Argo / Grafana /
 * любой control-plane), где пользователь ожидает дерево слева
 * **всегда** видимое, а правая панель — текущая projection.
 *
 * Контраст с TreeNav: тот рендерит схему иерархии (entity-types) внутри
 * catalog body. AdminShell — instance-aware tree (узлы это конкретные
 * Realm/Group/User записи с params), и tree это layout-region, не часть
 * artifact slots.
 *
 * Tree node shape:
 *   {
 *     id: string,                       // unique key
 *     label: string,                    // отображаемое имя
 *     projectionId: string,             // id projection для onSelect
 *     params?: Record<string, string>,  // опциональные routing params
 *     icon?: ReactNode,                 // опциональная иконка слева
 *     children?: TreeNode[],            // вложенные узлы
 *   }
 *
 * Props:
 *   - tree: TreeNode[] — корневые узлы дерева
 *   - body: ReactNode — текущий рендер projection справа
 *   - onSelect?: ({projectionId, params, node}) => void
 *   - currentNodeId?: string — id выбранного узла (для подсветки)
 *   - expanded?: string[] — initial expanded node ids (controlled
 *     mode, если задано — toggle отключён внутри; иначе uncontrolled)
 *   - onExpand?: (nodeId: string, isExpanded: boolean) => void
 *   - sidebarWidth?: number (default 260)
 *   - sidebarTitle?: string (default null — без заголовка)
 */
export default function AdminShell({
  tree = [],
  body = null,
  onSelect,
  currentNodeId,
  expanded,
  onExpand,
  sidebarWidth = 260,
  sidebarTitle = null,
}) {
  // Uncontrolled expansion state — только если expanded не задан.
  const [internalExpanded, setInternalExpanded] = useState(() => new Set());
  const expandedSet = expanded
    ? new Set(expanded)
    : internalExpanded;

  const toggleExpand = useCallback((nodeId) => {
    if (onExpand) {
      onExpand(nodeId, !expandedSet.has(nodeId));
      return;
    }
    if (expanded) return; // controlled — нельзя toggle
    setInternalExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, [expanded, expandedSet, onExpand]);

  return (
    <div
      data-primitive="adminShell"
      style={{
        display: "grid",
        gridTemplateColumns: `${sidebarWidth}px 1fr`,
        height: "100%",
        minHeight: 0,
      }}
    >
      <aside
        aria-label="Navigation"
        style={{
          borderRight: "1px solid var(--idf-border, #e5e7eb)",
          background: "var(--idf-card, #fafafa)",
          overflow: "auto",
          padding: "8px 4px",
        }}
      >
        {sidebarTitle && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--idf-text-muted, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              padding: "8px 12px 4px",
            }}
          >
            {sidebarTitle}
          </div>
        )}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              currentNodeId={currentNodeId}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </aside>
      <main
        style={{
          overflow: "auto",
          minWidth: 0,
        }}
      >
        {body}
      </main>
    </div>
  );
}

function TreeNode({ node, depth, currentNodeId, expandedSet, toggleExpand, onSelect }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedSet.has(node.id);
  const isActive = currentNodeId === node.id;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect({
        projectionId: node.projectionId,
        params: node.params,
        node,
      });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpand(node.id);
  };

  return (
    <li>
      <div
        data-active={isActive ? "true" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: 8 + depth * 14,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          background: isActive ? "var(--idf-accent-light, #ede9fe)" : "transparent",
          borderRadius: 4,
          margin: "1px 4px",
          cursor: "pointer",
          fontSize: 13,
          color: isActive ? "var(--idf-accent, #4f46e5)" : "var(--idf-text, #1a1a2e)",
          fontWeight: isActive ? 500 : 400,
        }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={`expand-${node.id}`}
            onClick={handleToggle}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontSize: 10,
              color: "var(--idf-text-muted, #9ca3af)",
              width: 14,
              textAlign: "center",
            }}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span style={{ width: 14 }} />
        )}
        {node.icon && <span style={{ display: "inline-flex" }}>{node.icon}</span>}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.label}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentNodeId={currentNodeId}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
