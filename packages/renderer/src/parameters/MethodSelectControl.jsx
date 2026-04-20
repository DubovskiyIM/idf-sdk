/**
 * MethodSelectControl — radio-card grid с icon + label + группы
 * (UI-gap #4, Workzilla-style payment-method selector).
 *
 * Spec authored как:
 *   {
 *     name: "method",
 *     control: "methodSelect",
 *     options: [
 *       { id: "kassa",  label: "Мир/Visa/Mastercard", sublabel: "Kassa",
 *         icon: "💳", group: "Банковская карта" },
 *       { id: "sbp",    label: "СБП", sublabel: "Система быстрых платежей",
 *         icon: "⚡",  group: "Банковская карта" },
 *       { id: "paypal", label: "PayPal", icon: "💰",
 *         group: "Электронные деньги" },
 *       { id: "stripe", label: "Visa/Mastercard", sublabel: "Stripe",
 *         icon: "💳", group: "Другое" },
 *     ],
 *   }
 *
 * Опции без `group` падают в группу без заголовка (render as single
 * block без header'а). Порядок групп — по первому появлению в options.
 */
export default function MethodSelectControl({ spec, value, onChange }) {
  const options = Array.isArray(spec.options) ? spec.options : [];
  const groups = groupOptions(options);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
      {spec.label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--idf-text)" }}>
          {spec.label}{spec.required && <span style={{ color: "var(--idf-danger, #ef4444)" }}> *</span>}
        </span>
      )}
      {groups.map((group, gi) => (
        <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {group.label && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--idf-text-muted, #6b7280)",
              }}
            >
              {group.label}
            </div>
          )}
          <div
            role="radiogroup"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {group.items.map(opt => {
              const isActive = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onChange(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: `1px solid ${
                      isActive
                        ? "var(--idf-accent, #1677ff)"
                        : "var(--idf-accent-soft, rgba(22,119,255,0.15))"
                    }`,
                    background: isActive
                      ? "var(--idf-accent-soft, rgba(22,119,255,0.1))"
                      : "var(--idf-surface-soft, #f0f7ff)",
                    color: "var(--idf-text, #1a1a2e)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    minHeight: 56,
                  }}
                >
                  {opt.icon && (
                    <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
                      {opt.icon}
                    </span>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                    {opt.sublabel && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--idf-text-muted, #6b7280)",
                        }}
                      >
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupOptions(options) {
  const groups = [];
  const byLabel = new Map();
  for (const opt of options) {
    const key = opt.group ?? null;
    if (!byLabel.has(key)) {
      const group = { label: key, items: [] };
      groups.push(group);
      byLabel.set(key, group);
    }
    byLabel.get(key).items.push(opt);
  }
  return groups;
}
