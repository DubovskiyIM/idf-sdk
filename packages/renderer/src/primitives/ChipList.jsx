/**
 * ChipList — отображение array-значений как коллекция chip'ов.
 * Use-case: Gravitino Tags on entity / Policies / User.roles, AWS tags,
 * K8s labels.
 *
 * Value — массив. Элементы могут быть:
 *   - string ("PII") → chip с текстом
 *   - object { name, color?, icon? } → chip с name + color styling
 *
 * Props:
 *   - value: array
 *   - variant?: "tag" | "policy" | "role" (default "tag") — визуальный стиль
 *   - maxVisible?: number (default 5) — сколько показать до +N overflow
 *   - onDetach?: (item, idx) => ... — если задан, появляется × на каждом chip
 *   - onItemClick?: (item) => ... — click на chip
 *   - emptyLabel?: string (default "Нет")
 *   - ctx — adapter delegation
 */
export default function ChipList({
  value,
  variant = "tag",
  maxVisible = 5,
  onDetach,
  onItemClick,
  emptyLabel = "Нет",
  ctx,
}) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "chipList");
  if (Adapted) {
    return <Adapted value={value} variant={variant} maxVisible={maxVisible} onDetach={onDetach} onItemClick={onItemClick} emptyLabel={emptyLabel} ctx={ctx} />;
  }

  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return <span style={emptyStyle}>{emptyLabel}</span>;
  }

  const visible = items.slice(0, maxVisible);
  const overflow = items.length - visible.length;

  return (
    <span style={listStyle}>
      {visible.map((item, i) => {
        const label = typeof item === "object" ? (item.label || item.name || JSON.stringify(item)) : String(item);
        const color = typeof item === "object" ? item.color : undefined;
        const clickable = !!onItemClick;
        return (
          <span
            key={i}
            style={chipStyle(variant, color, clickable)}
            onClick={clickable ? () => onItemClick(item) : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onItemClick(item); }
            } : undefined}
          >
            {typeof item === "object" && item.icon && <span style={iconStyle}>{item.icon}</span>}
            <span>{label}</span>
            {onDetach && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDetach(item, i); }}
                style={detachButtonStyle}
                aria-label={`Detach ${label}`}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span style={overflowStyle}>+{overflow}</span>
      )}
    </span>
  );
}

// Variant styles — tag (neutral), policy (amber), role (purple).
const VARIANT_STYLES = {
  tag: {
    background: "var(--idf-bg-subtle, #eef2f7)",
    color: "var(--idf-text, #1a1a2e)",
    border: "1px solid transparent",
  },
  policy: {
    background: "var(--idf-policy-bg, #fef3c7)",
    color: "var(--idf-policy-fg, #92400e)",
    border: "1px solid var(--idf-policy-border, #fde68a)",
  },
  role: {
    background: "var(--idf-role-bg, #ede9fe)",
    color: "var(--idf-role-fg, #5b21b6)",
    border: "1px solid var(--idf-role-border, #ddd6fe)",
  },
};

function chipStyle(variant, overrideColor, clickable) {
  const base = VARIANT_STYLES[variant] || VARIANT_STYLES.tag;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
    cursor: clickable ? "pointer" : "default",
    ...base,
    ...(overrideColor ? { background: overrideColor, color: "#fff", border: "1px solid transparent" } : {}),
  };
}

const listStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
};

const iconStyle = {
  fontSize: 12,
};

const detachButtonStyle = {
  marginLeft: 4,
  padding: 0,
  width: 14,
  height: 14,
  border: "none",
  background: "transparent",
  color: "inherit",
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
  opacity: 0.6,
};

const overflowStyle = {
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
  fontWeight: 500,
};

const emptyStyle = {
  color: "var(--idf-text-muted, #9ca3af)",
  fontSize: 12,
  fontStyle: "italic",
};
