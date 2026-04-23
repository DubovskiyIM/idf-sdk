import { useState, useRef, useCallback, useEffect } from "react";

/**
 * PropertyPopover — compact summary + click/hover-reveal detail panel
 * для key-value properties. Use-case: Gravitino `properties: {}` на
 * Metalake/Catalog/Schema/Table, AWS tags, K8s annotations.
 *
 * Value — object {key: value}.
 * Shows: "N properties" counter + "⋯" trigger. Click → popover с
 * scrollable список ключ=значение.
 *
 * Props:
 *   - value: object. Не-object → null. Пустой → "No properties".
 *   - summary?: string — override для counter.
 *   - maxInline?: number (default 3) — сколько показывается inline рядом
 *     с trigger'ом (до overflow). 0 → только counter.
 *   - ctx — adapter delegation.
 */
export default function PropertyPopover({ value, summary, maxInline = 3, ctx }) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "propertyPopover");
  if (Adapted) {
    return <Adapted value={value} summary={summary} maxInline={maxInline} ctx={ctx} />;
  }

  const entries = (value && typeof value === "object" && !Array.isArray(value))
    ? Object.entries(value)
    : [];

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const toggle = useCallback(() => setOpen(o => !o), []);

  if (entries.length === 0) {
    return <span style={emptyStyle}>Нет properties</span>;
  }

  const inlineEntries = maxInline > 0 ? entries.slice(0, maxInline) : [];
  const overflowCount = entries.length - inlineEntries.length;
  const counterLabel = summary || `${entries.length} ${pluralize(entries.length, ["property", "properties", "properties"])}`;

  return (
    <span ref={rootRef} style={rootStyle}>
      {inlineEntries.map(([k, v], i) => (
        <span key={k} style={inlineChipStyle}>
          <span style={inlineKeyStyle}>{k}</span>
          <span style={inlineValueStyle}>{formatValue(v)}</span>
        </span>
      ))}
      <button
        type="button"
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={triggerStyle}
      >
        {overflowCount > 0 ? `+${overflowCount}` : "⋯"}
        <span style={counterBadgeStyle}>{counterLabel}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Properties detail" style={popoverStyle}>
          <div style={popoverHeaderStyle}>{counterLabel}</div>
          <div style={popoverBodyStyle}>
            {entries.map(([k, v]) => (
              <div key={k} style={popoverRowStyle}>
                <span style={popoverKeyStyle}>{k}</span>
                <span style={popoverValueStyle}>{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

function formatValue(v) {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    try {
      return JSON.stringify(v).slice(0, 60);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function pluralize(n, forms) {
  // простая ru/en agnostic: <2 / 2..4 / rest
  if (n % 10 === 1 && n % 100 !== 11) return forms[0];
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1];
  return forms[2];
}

const rootStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  position: "relative",
  flexWrap: "wrap",
};

const inlineChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "1px 6px",
  background: "var(--idf-bg-subtle, #eef2f7)",
  borderRadius: 3,
  fontSize: 11,
  fontFamily: "ui-monospace, monospace",
};

const inlineKeyStyle = {
  color: "var(--idf-text-muted, #6b7280)",
};

const inlineValueStyle = {
  color: "var(--idf-text, #1a1a2e)",
  fontWeight: 500,
  maxWidth: 120,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const triggerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "1px 8px",
  background: "transparent",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 3,
  fontSize: 11,
  cursor: "pointer",
  color: "var(--idf-text-muted, #6b7280)",
  fontFamily: "inherit",
};

const counterBadgeStyle = {
  fontSize: 11,
  color: "var(--idf-text-muted, #9ca3af)",
};

const popoverStyle = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  minWidth: 280,
  maxWidth: 420,
  maxHeight: 320,
  overflowY: "auto",
  background: "var(--idf-card, #fff)",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 6,
  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  zIndex: 1000,
  fontSize: 13,
};

const popoverHeaderStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
  fontWeight: 600,
  fontSize: 12,
  color: "var(--idf-text, #1a1a2e)",
  background: "var(--idf-bg-subtle, #f9fafb)",
};

const popoverBodyStyle = {
  padding: "4px 0",
};

const popoverRowStyle = {
  display: "flex",
  gap: 12,
  padding: "4px 12px",
  alignItems: "flex-start",
};

const popoverKeyStyle = {
  flex: "0 0 auto",
  minWidth: 100,
  maxWidth: 160,
  color: "var(--idf-text-muted, #6b7280)",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const popoverValueStyle = {
  flex: 1,
  color: "var(--idf-text, #1a1a2e)",
  fontSize: 12,
  wordBreak: "break-word",
  fontFamily: "ui-monospace, monospace",
};

const emptyStyle = {
  color: "var(--idf-text-muted, #9ca3af)",
  fontSize: 12,
  fontStyle: "italic",
};
