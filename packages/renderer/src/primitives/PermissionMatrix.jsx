import { useMemo, useCallback, useState } from "react";

/**
 * PermissionMatrix — matrix resource × privilege с checkboxes per cell.
 * Role-centric model: один role имеет массив securableObjects, каждый с
 * privilege list. Визуализация: строки = resources (type:name), столбцы
 * = privileges, клетки = checked/unchecked.
 *
 * Shape (value):
 *   [
 *     { type: "metalake", name: "prod_lake",      privileges: ["select","modify"] },
 *     { type: "catalog",  name: "hive_warehouse", privileges: ["select"] },
 *     { type: "schema",   name: "*",              privileges: ["select","create"] },
 *   ]
 *
 * Props:
 *   - value: массив (как выше). Нечитаемые формы игнорируются.
 *   - onChange(next): для edit-mode (future). v1 только read-only.
 *   - readOnly: bool (default true).
 *   - privileges: список возможных privilege'ей для показа columns.
 *     Если не задан — dedupe из value.
 *   - ctx: adapter delegation через
 *     `ctx.adapter.getComponent("primitive", "permissionMatrix")`.
 *
 * Grouping: rows — resource по type (metalake/catalog/schema/table),
 * wildcard "*" имени показывается как `<type> (all)`.
 *
 * Use-case: Gravitino Role.securableObjects, AWS IAM policies,
 * K8s RBAC bindings — classical matrix visualization.
 */
export default function PermissionMatrix({ value, privileges, readOnly = true, onChange, ctx }) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "permissionMatrix");
  if (Adapted) {
    return <Adapted value={value} privileges={privileges} readOnly={readOnly} onChange={onChange} ctx={ctx} />;
  }

  const rows = useMemo(() => {
    return Array.isArray(value)
      ? value.filter(r => r && typeof r === "object" && typeof r.type === "string")
      : [];
  }, [value]);

  // Derive privileges-columns if not provided
  const effectivePrivileges = useMemo(() => {
    if (Array.isArray(privileges) && privileges.length > 0) return privileges;
    const set = new Set();
    for (const row of rows) {
      const privs = Array.isArray(row.privileges) ? row.privileges : [];
      for (const p of privs) if (typeof p === "string") set.add(p);
    }
    // Canonical order if common privileges detected
    const canon = ["select", "read", "create", "modify", "write", "delete", "use", "manage", "execute", "*"];
    const present = canon.filter(p => set.has(p));
    const extra = [...set].filter(p => !canon.includes(p)).sort();
    return [...present, ...extra];
  }, [rows, privileges]);

  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      String(r.type || "").toLowerCase().includes(q) ||
      String(r.name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const togglePrivilege = useCallback((rowIdx, privilege) => {
    if (readOnly || !onChange) return;
    const next = rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const privs = Array.isArray(r.privileges) ? r.privileges : [];
      if (privs.includes(privilege)) {
        return { ...r, privileges: privs.filter(p => p !== privilege) };
      }
      return { ...r, privileges: [...privs, privilege] };
    });
    onChange(next);
  }, [rows, onChange, readOnly]);

  if (rows.length === 0) {
    return <div style={emptyStyle}>Нет разрешений</div>;
  }

  const hasWildcardPrivilege = effectivePrivileges.includes("*");

  return (
    <div style={rootStyle}>
      <div style={toolbarStyle}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Фильтр ресурсов…"
          style={searchInputStyle}
        />
        <span style={countStyle}>
          {filteredRows.length} / {rows.length} resources · {effectivePrivileges.length} privileges
        </span>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headCellStyle, textAlign: "left" }}>Resource</th>
            {effectivePrivileges.map(p => (
              <th
                key={p}
                style={{ ...headCellStyle, textAlign: "center", width: p === "*" ? 44 : 80 }}
              >
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => {
            const rowIdx = rows.indexOf(row);
            const privs = Array.isArray(row.privileges) ? new Set(row.privileges) : new Set();
            const isWildcardRow = row.name === "*";
            const grantsAll = privs.has("*") || (hasWildcardPrivilege && privs.has("*"));
            return (
              <tr key={rowIdx} style={bodyRowStyle}>
                <td style={resourceCellStyle}>
                  <span style={typeBadgeStyle}>{row.type}</span>
                  <span style={isWildcardRow ? resourceWildcardStyle : resourceNameStyle}>
                    {isWildcardRow ? `${row.type} (all)` : row.name || ""}
                  </span>
                  {/* P-K-D: inheritance-badge (composite / group / other
                      source). value[].inheritedFrom: string | {kind, via}.
                      Для direct-назначения — не рендерится. */}
                  {row.inheritedFrom && (
                    <InheritanceBadge source={row.inheritedFrom} />
                  )}
                </td>
                {effectivePrivileges.map(p => {
                  const checked = privs.has(p) || (grantsAll && p !== "*");
                  const ownExplicit = privs.has(p);
                  return (
                    <td
                      key={p}
                      style={{
                        ...cellStyle,
                        background: checked
                          ? (ownExplicit ? "var(--idf-accent-light, #eef5ff)" : "var(--idf-bg-subtle, #f3f4f6)")
                          : "transparent",
                      }}
                    >
                      {readOnly ? (
                        <span style={checkMarkStyle}>{checked ? (ownExplicit ? "●" : "○") : ""}</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={ownExplicit}
                          onChange={() => togglePrivilege(rowIdx, p)}
                          aria-label={`${row.type}:${row.name} ${p}`}
                          disabled={grantsAll && p !== "*"}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasWildcardPrivilege && (
        <div style={legendStyle}>
          <span style={legendDotFilled}>●</span> explicit · <span style={legendDotHollow}>○</span> granted by `*` wildcard
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 10px",
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
  background: "var(--idf-bg-subtle, #f9fafb)",
  gap: 10,
};

const searchInputStyle = {
  flex: 1,
  maxWidth: 240,
  padding: "3px 8px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 3,
  fontSize: 12,
};

const countStyle = {
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
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
};

const bodyRowStyle = {
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
};

const resourceCellStyle = {
  padding: "6px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const typeBadgeStyle = {
  background: "var(--idf-bg-subtle, #eef2f7)",
  padding: "1px 6px",
  borderRadius: 3,
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
  fontFamily: "ui-monospace, monospace",
};

const resourceNameStyle = {
  color: "var(--idf-text, #1a1a2e)",
};

const resourceWildcardStyle = {
  color: "var(--idf-text-muted, #6b7280)",
  fontStyle: "italic",
};

const cellStyle = {
  padding: "6px 10px",
  textAlign: "center",
  verticalAlign: "middle",
};

const checkMarkStyle = {
  fontSize: 14,
  color: "var(--idf-accent, #2563eb)",
  userSelect: "none",
};

const emptyStyle = {
  padding: "12px 16px",
  color: "var(--idf-text-muted, #9ca3af)",
  fontSize: 13,
  fontStyle: "italic",
  textAlign: "center",
};

const legendStyle = {
  padding: "6px 10px",
  borderTop: "1px solid var(--idf-border-subtle, #f3f4f6)",
  background: "var(--idf-bg-subtle, #f9fafb)",
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
};

const legendDotFilled = {
  color: "var(--idf-accent, #2563eb)",
};

const legendDotHollow = {
  color: "var(--idf-text-muted, #9ca3af)",
};

/**
 * P-K-D (Keycloak Stage 9): inheritance-badge для role-mappings.
 * Keycloak User имеет 4 источника ролей: direct / composite / group /
 * client-default. Badge визуализирует источник — user видит не только
 * наличие роли, но и причину (почему она attached).
 *
 * source shape:
 *   - string: "composite:admin" / "group:developers" — parses kind:via
 *   - object: { kind: "composite" | "group" | "client" | ..., via: string }
 */
function InheritanceBadge({ source }) {
  const parsed = typeof source === "string"
    ? (() => {
        const [kind, ...viaParts] = source.split(":");
        return { kind, via: viaParts.join(":") };
      })()
    : (source || {});
  const { kind, via } = parsed;
  if (!kind) return null;

  const toneMap = {
    composite: { bg: "#ede9fe", fg: "#5b21b6", label: "через composite" },
    group:     { bg: "#dbeafe", fg: "#1e40af", label: "через группу" },
    client:    { bg: "#dcfce7", fg: "#166534", label: "client-default" },
    inherited: { bg: "#f3f4f6", fg: "#374151", label: "inherited" },
  };
  const tone = toneMap[kind] || { bg: "#f3f4f6", fg: "#374151", label: kind };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        marginLeft: 8,
        padding: "1px 6px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        background: tone.bg,
        color: tone.fg,
      }}
      title={via ? `${tone.label}: ${via}` : tone.label}
    >
      {tone.label}{via ? `: ${via}` : ""}
    </span>
  );
}
