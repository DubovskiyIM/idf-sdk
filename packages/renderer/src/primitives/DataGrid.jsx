import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import RowAssociationChips, { pluralizeAsLabel } from "./RowAssociationChips.jsx";
import { Badge } from "./atoms.jsx";
import { evalFilter } from "@intent-driven/core";
import { evalCondition } from "../eval.js";

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
  const authoredColumns = Array.isArray(node?.columns) ? node.columns : [];
  const emptyLabel = node?.emptyLabel ?? "Нет данных";

  // Pattern-derived row-associations (inline-chip-association). Добавляем chip-колонки
  // после authored columns, перед actions. idempotent: если автор уже задал column
  // с тем же key, pattern-колонку пропускаем.
  const columns = useMemo(() => {
    const rowAssocs = Array.isArray(ctx?.rowAssociations) ? ctx.rowAssociations : [];
    if (rowAssocs.length === 0) return authoredColumns;
    const authoredKeys = new Set(authoredColumns.map(c => c?.key).filter(Boolean));
    const chipCols = rowAssocs
      .filter(assoc => assoc && assoc.junction && assoc.foreignKey)
      .map(assoc => {
        const key = `assoc_${String(assoc.junction).toLowerCase()}`;
        return {
          key,
          label: assoc.otherEntity ? pluralizeAsLabel(assoc.otherEntity) : assoc.junction,
          kind: "chipAssociation",
          assoc,
          source: assoc.source,
        };
      })
      .filter(col => !authoredKeys.has(col.key));
    // Actions-колонку (если есть) держим последней — chip cols вставляем перед ней.
    const actionIdx = authoredColumns.findIndex(c => c?.kind === "actions");
    if (actionIdx === -1) return [...authoredColumns, ...chipCols];
    return [
      ...authoredColumns.slice(0, actionIdx),
      ...chipCols,
      ...authoredColumns.slice(actionIdx),
    ];
  }, [authoredColumns, ctx?.rowAssociations]);

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
                    {col.kind === "actions" ? (
                      <ActionCell item={item} col={col} ctx={ctx} />
                    ) : col.kind === "chipAssociation" ? (
                      <ChipCell item={item} col={col} ctx={ctx} />
                    ) : col.kind === "badge" ? (
                      <BadgeCell item={item} col={col} ctx={ctx} />
                    ) : (
                      <CellValue value={item[col.key]} col={col} />
                    )}
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
 * Резолвит `params`-шаблон action'а против item + routeParams:
 *   - "item.X"  → record[X]
 *   - "route.Y" → ctx.routeParams[Y]
 *   - всё остальное — literal
 */
function resolveActionParams(spec, item, ctx) {
  const out = {};
  for (const [k, v] of Object.entries(spec || {})) {
    if (typeof v === "string" && v.startsWith("item.")) {
      out[k] = item?.[v.slice(5)];
    } else if (typeof v === "string" && v.startsWith("route.")) {
      out[k] = ctx?.routeParams?.[v.slice(6)];
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * ActionCell — per-row actions для `col.kind === "actions"`.
 *
 * Каждый action = `{ intent, label, params?, danger?, disabled? }`:
 *   - `intent` — intent ID для ctx.exec
 *   - `label` — текст кнопки / menu-пункта
 *   - `params` — map (см. resolveActionParams)
 *   - `danger: true` — visual-hint (красный), семантический для revoke/delete
 *   - `disabled: (item, ctx) => boolean` — опциональный predicate
 *
 * Display modes (`col.display`):
 *   - `"inline"` — все кнопки в ряд (legacy, дефолт для ≤2 actions)
 *   - `"menu"` — kebab (⋯) icon → dropdown со всеми пунктами
 *   - `"auto"` (default) — inline если ≤2 actions, иначе menu
 *
 * Menu mode хорошо скейлится для CRUD-admin таблиц: 3+ actions в
 * строке создают визуальный шум, dropdown сохраняет плотность.
 * Совпадает с AntD Pro ProTable / Stripe Dashboard / K8s Lens / GitHub
 * row-level patterns.
 *
 * Click.stopPropagation — row-click не триггерится вместе с action.
 */
/**
 * G-K-24 fix: для intents с confirmation:"form" — открыть overlay
 * вместо exec. Иначе update/edit-flow ломается (button рендерится,
 * но click пустой effect, modal не открывается).
 *
 * Priority resolution:
 *   1. action.opens === "overlay" — explicit override (highest)
 *   2. ctx.intents[action.intent].confirmation === "form" + ctx.openOverlay
 *      → auto-open overlay с key `overlay_${intent}` (default convention)
 *   3. fallback — ctx.exec (backward-compat для click-confirmation intents)
 */
function triggerAction(a, item, ctx) {
  if (!a?.intent) return;
  // Explicit override
  if (a.opens === "overlay" && ctx?.openOverlay) {
    const key = a.overlayKey || `overlay_${a.intent}`;
    ctx.openOverlay(key, { item });
    return;
  }
  // Auto-detect form-confirmation
  const intentDef = ctx?.intents?.[a.intent];
  const confirmation = intentDef?.confirmation || intentDef?.particles?.confirmation;
  if (confirmation === "form" && ctx?.openOverlay) {
    ctx.openOverlay(`overlay_${a.intent}`, { item });
    return;
  }
  // Fallback — direct exec
  if (ctx?.exec) {
    ctx.exec(a.intent, resolveActionParams(a.params, item, ctx));
  }
}

function ActionCell({ item, col, ctx }) {
  const actions = Array.isArray(col.actions) ? col.actions : [];
  if (actions.length === 0) return <span style={mutedStyle}>—</span>;

  const mode = col.display === "inline" || col.display === "menu"
    ? col.display
    : (actions.length <= 2 ? "inline" : "menu");

  if (mode === "menu") {
    return <ActionMenu item={item} col={col} ctx={ctx} actions={actions} />;
  }

  return (
    <span style={actionRowStyle} onClick={(e) => e.stopPropagation()}>
      {actions.map((a, i) => {
        const disabled = typeof a.disabled === "function" ? a.disabled(item, ctx) : !!a.disabled;
        return (
          <button
            key={a.intent || i}
            type="button"
            disabled={disabled}
            onClick={() => triggerAction(a, item, ctx)}
            style={a.danger ? actionButtonDangerStyle : actionButtonStyle}
          >
            {a.label || a.intent}
          </button>
        );
      })}
    </span>
  );
}

/**
 * BadgeCell — cell-renderer для column.kind === "badge". Делегирует в
 * shared primitive Badge (atoms.jsx) с поддержкой `col.colorMap` и
 * `col.toneMap`. Используется для статус-полей (sync.status, health.status,
 * connection.status) в status-driven admin UIs (ArgoCD / Gravitino /
 * Keycloak).
 *
 * Shape:
 *   { key: "syncStatus", kind: "badge", colorMap: {
 *       Synced: "success", OutOfSync: "warning", Unknown: "neutral"
 *   } }
 *
 * `colorMap` — alias `toneMap` для semantic-tone-vocabulary Badge primitive
 * (success/warning/danger/info/neutral/default). colorMap читается первым,
 * fallback на toneMap для обратной совместимости.
 */
function BadgeCell({ item, col, ctx }) {
  const val = item?.[col.key];
  if (val == null || val === "") return <span style={mutedStyle}>—</span>;
  const toneMap = col.colorMap || col.toneMap;
  const node = {
    bind: col.key,
    toneMap,
    // если у колонки задан tone без mapping — применяем как global override
    color: col.color,
  };
  return <Badge node={node} ctx={ctx || {}} item={item} />;
}

/**
 * ChipCell — cell-renderer для column.kind === "chipAssociation" (pattern
 * inline-chip-association). Делегирует в shared primitive RowAssociationChips.
 */
function ChipCell({ item, col, ctx }) {
  const assoc = col?.assoc;
  if (!assoc?.junction || !assoc.foreignKey || !ctx?.world) {
    return <span style={mutedStyle}>—</span>;
  }
  return <RowAssociationChips assoc={assoc} item={item} ctx={ctx} layout="inline" />;
}

/**
 * ActionMenu — kebab-icon (⋯) open'ит inline dropdown со списком
 * actions. Чтобы не тащить portal-layer в primitive-fallback,
 * использует absolute-positioned div под триггером.
 * Click-outside закрывает меню через document listener.
 */
function ActionMenu({ item, col, ctx, actions }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.parentElement.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const icon = col.icon === "gear" ? "⚙" : "⋯";

  return (
    <span
      style={actionMenuWrapStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={actionMenuTriggerStyle}
        title={col.menuLabel || "Actions"}
      >
        {icon}
      </button>
      {open && (
        <div role="menu" style={actionMenuDropdownStyle}>
          {actions.map((a, i) => {
            const disabled = typeof a.disabled === "function" ? a.disabled(item, ctx) : !!a.disabled;
            return (
              <button
                key={a.intent || i}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  if (!ctx?.exec) return;
                  ctx.exec(a.intent, resolveActionParams(a.params, item, ctx));
                }}
                style={a.danger ? actionMenuItemDangerStyle : actionMenuItemStyle}
              >
                {a.label || a.intent}
              </button>
            );
          })}
        </div>
      )}
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

const actionMenuWrapStyle = {
  display: "inline-block",
  position: "relative",
};

const actionMenuTriggerStyle = {
  padding: "2px 8px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: "var(--idf-card, #fff)",
  color: "var(--idf-text, #1a1a2e)",
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
};

const actionMenuDropdownStyle = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 4px)",
  background: "var(--idf-card, #fff)",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
  padding: "4px 0",
  minWidth: 160,
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
};

const actionMenuItemStyle = {
  padding: "6px 14px",
  border: "none",
  background: "transparent",
  color: "var(--idf-text, #1a1a2e)",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
};

const actionMenuItemDangerStyle = {
  ...actionMenuItemStyle,
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
/**
 * G-K-25 fix: resolveItems учитывает node.filter (string или object).
 * String filter — через evalCondition (с world/viewer/viewState +
 * row keys spread). Object filter — через evalFilter (simple/disjunction/
 * m2m-via). Семантически совпадает с List::applyFilter в containers.jsx.
 *
 * Применяется к items array OR collection из ctx.world[source].
 */
function resolveItems(node, ctx) {
  let items = [];
  if (Array.isArray(node?.items) && node.items.length > 0) {
    items = node.items;
  } else if (node?.source && typeof node.source === "string" && ctx?.world) {
    const collection = ctx.world[node.source];
    if (Array.isArray(collection)) items = collection;
  }
  if (!node?.filter || items.length === 0) return items;
  const filter = node.filter;
  if (typeof filter === "object") {
    return items.filter(it => evalFilter(filter, it, {
      viewer: ctx?.viewer, world: ctx?.world,
    }));
  }
  return items.filter(it => evalCondition(filter, {
    ...it, item: it,
    viewer: ctx?.viewer, world: ctx?.world,
    viewState: ctx?.viewState || {},
  }));
}

// Export для testing
export { resolveItems };
