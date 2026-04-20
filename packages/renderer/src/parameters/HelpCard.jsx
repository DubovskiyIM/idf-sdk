/**
 * HelpCard — contextual hint рядом с parameter'ом (UI-gap #7, Workzilla-style).
 *
 * Рендерится как compact card под input-control'ом (inline mode).
 * Side-card layout (floating справа от form'ы) — future, требует form-
 * layout awareness в ArchetypeForm / FormModal.
 *
 * Spec authored как `parameter.help`:
 *   {
 *     title: "Какую стоимость поставить?",
 *     text: "Укажите стоимость, которую готовы заплатить за задание.
 *            Важно, чтобы цена соответствовала объёму работы.",
 *     icon: "💡",           // опц., дефолт "💡"
 *     illustration: "/...", // опц., URL иллюстрации для side-layout (future)
 *   }
 *
 * Shortcut form — `help: "строка"` → treated as { text: "строка" }.
 */
export default function HelpCard({ help }) {
  if (!help) return null;
  const normalized = typeof help === "string" ? { text: help } : help;
  const { title, text, icon = "💡" } = normalized;
  if (!title && !text) return null;

  return (
    <div
      role="note"
      style={{
        marginTop: 6,
        padding: "10px 12px",
        borderRadius: 6,
        background: "var(--idf-surface-soft, #f0f7ff)",
        border: "1px solid var(--idf-accent-soft, rgba(22, 119, 255, 0.2))",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 12,
        lineHeight: 1.45,
        color: "var(--idf-text-muted, #6b7280)",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              color: "var(--idf-text, #374151)",
              marginBottom: text ? 4 : 0,
            }}
          >
            {title}
          </div>
        )}
        {text && <div>{text}</div>}
      </div>
    </div>
  );
}
