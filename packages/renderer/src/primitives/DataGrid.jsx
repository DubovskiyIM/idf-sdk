import { useState, useMemo, useCallback } from "react";

/**
 * DataGrid — enhanced table primitive с sort / per-column filter /
 * column-visibility toggle. Catalog-архетип с `shape: "table"` может
 * рендериться через DataGrid вместо простого grid-card.
 *
 * Shape:
 *   {
 *     type: "dataGrid",
 *     items: [{ id, name, type, ... }],
 *     columns: [
 *       { key: "name", label: "Name", sortable: true, filterable: true, width?, align? },
 *       { key: "type", label: "Type", filterable: true, filter: "enum", values: ["a","b"] },
 *     ],
 *     emptyLabel?: "Нет данных",
 *     onItemClick?: (item) => ..., // optional row-click
 *   }
 *
 * Фичи v1:
 *   - Per-column sort: клик на header toggle'ит asc→desc→none.
 *   - Per-column filter: text-input для filterable columns; "enum" kind —
 *     select с values.
 *   - Column visibility toggle через меню (minimal — без сохранения).
 *   - Row click emits ctx.navigate or onItemClick.
 *   - Adapter-delegation: ctx.adapter.getComponent("primitive", "dataGrid")
 *     → native grid (AntD Table). SVG-fallback: semantic <table>.
 *
 * Не в scope v1: column resize drag, pinning, virtualization 1000+ rows.
 * Стандартные AntD адаптации закрывают это при capability registration.
 */
export default function DataGrid({ node, ctx }) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "dataGrid");
  if (Adapted) {
    return <Adapted node={node} ctx={ctx} />;
  }

  // items: либо node.items напрямую, либо resolved из ctx.world[source].
  // Это позволяет использовать DataGrid как authored-body в catalog
  // проекции (projection.bodyOverride) без ручного runtime-filling —
  // SDK сам подтянет коллекцию из world по convention (same как list /
  // card-list source).
  const items = resolveItems(node, ctx);
  const columns = Array.isArray(node?.columns) ? node.columns : [];
  const emptyLabel = node?.emptyLabel ?? "Нет данных";

  const [sortBy, setSortBy] = useState(null); // {key, dir: "asc"|"desc"}
  const [filters, setFilters] = useState({}); // {key: string}
  const [hiddenCols, setHiddenCols] = useState(new Set());

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  const processed = useMemo(() => {
    let result = items;
    // Filter
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = columns.find(c => c.key === key);
      if (!col) continue;
      const q = String(value).toLowerCase();
      result = result.filter(it => {
        const v = it[key];
        if (v == null) return false;
        return String(v).toLowerCase().includes(q);
      });
    }
    // Sort
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const av = a[sortBy.key], bv = b[sortBy.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortBy.dir === "desc" ? -cmp : cmp;
      });
    }
    return result;
  }, [items, columns, filters, sortBy]);

  const toggleSort = useCallback((key) => {
    setSortBy(cur => {
      if (!cur || cur.key !== key) return { key, dir: "asc" };
      if (cur.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const setFilter = useCallback((key, value) => {
    setFilters(cur => ({ ...cur, [key]: value }));
  }, []);

  const toggleHidden = useCallback((key) => {
    setHiddenCols(cur => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRowClick = useCallback((item) => {
    if (node?.onItemClick && typeof node.onItemClick === "function") {
      node.onItemClick(item);
      return;
    }
    if (node?.onItemClick?.action === "navigate" && ctx?.navigate) {
      const params = {};
      const paramsSpec = node.onItemClick.params || {};
      for (const [k, v] of Object.entries(paramsSpec)) {
        if (typeof v === "string" && v.startsWith("item.")) {
          params[k] = item[v.slice(5)];
        } else {
          params[k] = v;
        }
      }
      ctx.navigate(node.onItemClick.to, params);
    }
  }, [node, ctx]);

  const hasAnyFilter = columns.some(c => c.filterable);

  return (
    <div style={rootStyle}>
      {/* Column-visibility menu */}
      {columns.length > 3 && (
        <div style={toolbarStyle}>
          <ColumnMenu columns={columns} hiddenCols={hiddenCols} onToggle={toggleHidden} />
        </div>
      )}
      <table style={tableStyle}>
        <thead>
          <tr>
            {visibleColumns.map(col => (
              <HeaderCell
                key={col.key}
                col={col}
                sortBy={sortBy}
                onToggleSort={toggleSort}
              />
            ))}
          </tr>
          {hasAnyFilter && (
            <tr>
              {visibleColumns.map(col => (
                <FilterCell
                  key={col.key}
                  col={col}
                  value={filters[col.key] || ""}
                  onChange={(v) => setFilter(col.key, v)}
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {processed.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} style={emptyRowStyle}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            processed.map((item, i) => (
              <tr
                key={item.id ?? i}
                style={node?.onItemClick ? rowClickableStyle : bodyRowStyle}
                onClick={() => handleRowClick(item)}
              >
                {visibleColumns.map(col => (
                  <td key={col.key} style={{ ...bodyCellStyle, textAlign: col.align || "left" }}>
                    {col.kind === "actions"
                      ? <ActionCell item={item} col={col} ctx={ctx} />
                      : <CellValue value={item[col.key]} col={col} />}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function HeaderCell({ col, sortBy, onToggleSort }) {
  const isSorted = sortBy?.key === col.key;
  const sortIndicator = isSorted ? (sortBy.dir === "asc" ? " ↑" : " ↓") : "";
  // Actions-column не сортируется (нет скалярного значения для compare).
  const clickable = col.kind !== "actions" && col.sortable !== false;
  return (
    <th
      style={{
        ...headCellStyle,
        textAlign: col.align || "left",
        cursor: clickable ? "pointer" : "default",
        width: col.width,
      }}
      onClick={clickable ? () => onToggleSort(col.key) : undefined}
      aria-sort={isSorted ? sortBy.dir === "asc" ? "ascending" : "descending" : "none"}
    >
      {col.label || col.key}{sortIndicator}
    </th>
  );
}

function FilterCell({ col, value, onChange }) {
  if (col.kind === "actions" || !col.filterable) return <td style={filterCellStyle} />;
  if (col.filter === "enum" && Array.isArray(col.values)) {
    return (
      <td style={filterCellStyle}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="">—</option>
          {col.values.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </td>
    );
  }
  return (
    <td style={filterCellStyle}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="filter…"
        style={filterInputStyle}
      />
    </td>
  );
}

function CellValue({ value, col }) {
  if (value == null) return <span style={mutedStyle}>—</span>;
  if (col.format === "badge") {
    return <span style={badgeStyle}>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    // Arrays render как chip-list (для tags/roles) или count
    if (value.length === 0) return <span style={mutedStyle}>—</span>;
    return (
      <span style={chipListStyle}>
        {value.slice(0, 3).map((v, i) => (
          <span key={i} style={chipStyle}>{String(typeof v === "object" ? v.name || v.id || JSON.stringify(v).slice(0, 20) : v)}</span>
        ))}
        {value.length > 3 && <span style={mutedStyle}>+{value.length - 3}</span>}
      </span>
    );
  }
  if (typeof value === "object") {
    return <code style={codeStyle}>{JSON.stringify(value).slice(0, 40)}</code>;
  }
  return <span>{String(value)}</span>;
}

/**
 * ActionCell — per-row buttons для `col.kind === "actions"`.
 *
 * Каждый action = `{ intent, label, params?, danger?, disabled? }`:
 *   - `intent` — intent ID для ctx.exec
 *   - `label` — текст кнопки
 *   - `params` — map где значения "item.X" резолвятся против record,
 *     "route.Y" — против ctx.routeParams, всё остальное — literal
 *   - `danger: true` — visual-hint (красный), семантический для revoke/delete
 *   - `disabled: (item, ctx) => boolean` — опциональный predicate
 *
 * Click.stopPropagation — чтобы row-click не триггерился одновременно.
 */
function ActionCell({ item, col, ctx }) {
  const actions = Array.isArray(col.actions) ? col.actions : [];
  if (actions.length === 0) return <span style={mutedStyle}>—</span>;
  return (
    <span style={actionRowStyle} onClick={(e) => e.stopPropagation()}>
      {actions.map((a, i) => {
        const disabled = typeof a.disabled === "function" ? a.disabled(item, ctx) : !!a.disabled;
        return (
          <button
            key={a.intent || i}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!ctx?.exec) return;
              const resolved = {};
              for (const [k, v] of Object.entries(a.params || {})) {
                if (typeof v === "string" && v.startsWith("item.")) {
                  resolved[k] = item?.[v.slice(5)];
                } else if (typeof v === "string" && v.startsWith("route.")) {
                  resolved[k] = ctx?.routeParams?.[v.slice(6)];
                } else {
                  resolved[k] = v;
                }
              }
              ctx.exec(a.intent, resolved);
            }}
            style={a.danger ? actionButtonDangerStyle : actionButtonStyle}
          >
            {a.label || a.intent}
          </button>
        );
      })}
    </span>
  );
}

function ColumnMenu({ columns, hiddenCols, onToggle }) {
  const [open, setOpen] = useState(false);
  const visibleCount = columns.length - hiddenCols.size;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={menuButtonStyle}
      >
        Columns ({visibleCount}/{columns.length})
      </button>
      {open && (
        <div style={menuDropdownStyle}>
          {columns.map(col => (
            <label key={col.key} style={menuItemStyle}>
              <input
                type="checkbox"
                checked={!hiddenCols.has(col.key)}
                onChange={() => onToggle(col.key)}
              />
              {" "}{col.label || col.key}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const rootStyle = {
  fontSize: 13,
  fontFamily: "inherit",
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 6,
  background: "var(--idf-card, #fff)",
  overflow: "hidden",
};

const toolbarStyle = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
  background: "var(--idf-bg-subtle, #f9fafb)",
  display: "flex",
  justifyContent: "flex-end",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const headCellStyle = {
  padding: "8px 10px",
  background: "var(--idf-bg-subtle, #f9fafb)",
  borderBottom: "1px solid var(--idf-border, #e5e7eb)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "var(--idf-text-muted, #6b7280)",
  userSelect: "none",
};

const filterCellStyle = {
  padding: "4px 6px",
  background: "var(--idf-card, #fff)",
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
};

const filterInputStyle = {
  width: "100%",
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 3,
  fontSize: 12,
};

const filterSelectStyle = {
  width: "100%",
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 3,
  fontSize: 12,
  background: "var(--idf-card, #fff)",
};

const bodyRowStyle = {
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
};

const rowClickableStyle = {
  ...bodyRowStyle,
  cursor: "pointer",
};

const bodyCellStyle = {
  padding: "6px 10px",
  verticalAlign: "middle",
};

const emptyRowStyle = {
  padding: "20px",
  textAlign: "center",
  color: "var(--idf-text-muted, #9ca3af)",
  fontStyle: "italic",
};

const mutedStyle = { color: "var(--idf-text-muted, #9ca3af)" };

const badgeStyle = {
  background: "var(--idf-bg-subtle, #eef2f7)",
  color: "var(--idf-text, #1a1a2e)",
  padding: "1px 8px",
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 500,
};

const chipListStyle = {
  display: "inline-flex",
  gap: 4,
  flexWrap: "wrap",
  alignItems: "center",
};

const chipStyle = {
  background: "var(--idf-bg-subtle, #eef2f7)",
  color: "var(--idf-text, #1a1a2e)",
  padding: "1px 6px",
  borderRadius: 10,
  fontSize: 11,
};

const codeStyle = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
};

const menuButtonStyle = {
  padding: "3px 10px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: "var(--idf-card, #fff)",
  fontSize: 12,
  cursor: "pointer",
  color: "var(--idf-text, #374151)",
};

const menuDropdownStyle = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 4px)",
  background: "var(--idf-card, #fff)",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  padding: "6px 4px",
  minWidth: 160,
  zIndex: 10,
};

const menuItemStyle = {
  display: "block",
  padding: "4px 10px",
  fontSize: 13,
  cursor: "pointer",
};

const actionRowStyle = {
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
};

const actionButtonStyle = {
  padding: "3px 10px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: "var(--idf-card, #fff)",
  color: "var(--idf-text, #1a1a2e)",
  fontSize: 12,
  cursor: "pointer",
};

const actionButtonDangerStyle = {
  ...actionButtonStyle,
  borderColor: "var(--idf-danger-border, #fca5a5)",
  color: "var(--idf-danger, #b91c1c)",
};

/**
 * Resolve items — приоритет node.items над ctx.world[source].
 * Behaviour:
 *   - node.items (array) указан + non-empty → используем
 *   - node.items (array) пустой + node.source → ctx.world[source]
 *   - node.items (array) пустой + source не указан → []
 *   - node.items не array → [] (защита от невалидных форм)
 *
 * Source — имя коллекции в world (e.g. "catalogs", "users", "tables").
 * Совпадает с convention catalog-архетипа (buildCatalogBody.source).
 */
function resolveItems(node, ctx) {
  if (Array.isArray(node?.items) && node.items.length > 0) {
    return node.items;
  }
  if (node?.source && typeof node.source === "string" && ctx?.world) {
    const collection = ctx.world[node.source];
    if (Array.isArray(collection)) return collection;
  }
  return Array.isArray(node?.items) ? node.items : [];
}

// Export для testing
export { resolveItems };
