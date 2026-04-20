import SlotRenderer from "../SlotRenderer.jsx";

/**
 * EmptyState — унифицированная заглушка для «ничего нет» / «не найдено».
 *
 * Два режима вызова:
 *
 * 1) Как primitive из SlotRenderer (node-shape):
 *    { type: "emptyState", title, hint?, icon?, illustration?, cta?, size? }
 *    SlotRenderer передаёт node={...}. Primitive дёргает из node.
 *
 * 2) Как прямой React-компонент (legacy, для dashboard-widget'ов):
 *    <EmptyState title="..." hint="..." icon="..." size="sm" />
 *    Старые вызовы оставлены back-compatible — props читаются напрямую.
 *
 * Fields:
 *   title         — основная строка (обязательна)
 *   hint          — подсказка второго порядка (опц.)
 *   icon          — emoji или React-нода (дефолт "📭")
 *   illustration  — data-URL / URL / React-нода: крупная картинка над title
 *                   (для ростового empty-state workzilla-стиля). Если задана,
 *                   icon игнорируется.
 *   cta           — { label, intentId, onClick? } — primary-кнопка под hint.
 *                   Click → ctx.exec(intentId) (если есть в ctx); onClick —
 *                   для custom handler'ов (host-specific flows).
 *   size          — "sm" | "md" (дефолт "md")
 */
export default function EmptyState(props) {
  // Primitive invocation — SlotRenderer передаёт { node, ctx, item }.
  // Legacy — flat props.
  const isPrimitive = "node" in props;
  const source = isPrimitive ? props.node : props;
  const { title, hint, icon = "📭", illustration, cta, size = "md" } = source;
  const ctx = isPrimitive ? props.ctx : null;
  const isSm = size === "sm";

  const onCtaClick = () => {
    if (!cta) return;
    if (typeof cta.onClick === "function") return cta.onClick(ctx);
    if (cta.intentId && ctx?.exec) ctx.exec(cta.intentId, cta.params || {});
  };

  return (
    <div style={{
      padding: isSm ? "24px 16px" : "64px 32px",
      textAlign: "center",
      color: "var(--idf-text-muted, #9ca3af)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: isSm ? 6 : 12,
    }}>
      {illustration ? (
        typeof illustration === "string" ? (
          <img
            src={illustration}
            alt=""
            style={{ maxWidth: isSm ? 140 : 240, maxHeight: isSm ? 140 : 240, opacity: 0.9 }}
          />
        ) : (
          illustration
        )
      ) : (
        <div style={{ fontSize: isSm ? 28 : 48, opacity: 0.5, lineHeight: 1 }}>{icon}</div>
      )}
      <div style={{
        fontSize: isSm ? 13 : 15,
        color: "var(--idf-text, #374151)",
        fontWeight: 500,
      }}>{title}</div>
      {hint && (
        <div style={{ fontSize: isSm ? 11 : 13, maxWidth: 360, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
      {cta && (
        <button
          type="button"
          onClick={onCtaClick}
          style={{
            marginTop: 8,
            padding: "10px 22px",
            borderRadius: 6,
            border: "none",
            background: "var(--idf-accent, #1677ff)",
            color: "var(--idf-on-accent, #fff)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
