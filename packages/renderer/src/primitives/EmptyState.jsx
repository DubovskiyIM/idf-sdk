/**
 * EmptyState — унифицированная заглушка для «ничего нет» / «не найдено».
 *
 * Props:
 *   title  — основная строка (обязательна)
 *   hint   — подсказка второго порядка (опц.)
 *   icon   — emoji или React-нода (дефолт "📭")
 *   size   — "sm" | "md" (дефолт "md") — управляет padding'ом для dashboard-карточек
 */
export default function EmptyState({ title, hint, icon = "📭", size = "md" }) {
  const isSm = size === "sm";
  return (
    <div style={{
      padding: isSm ? "24px 16px" : "64px 32px",
      textAlign: "center",
      color: "var(--mantine-color-dimmed, #9ca3af)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: isSm ? 6 : 12,
    }}>
      <div style={{ fontSize: isSm ? 28 : 48, opacity: 0.5, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: isSm ? 13 : 15,
        color: "var(--mantine-color-text, #374151)",
        fontWeight: 500,
      }}>{title}</div>
      {hint && (
        <div style={{ fontSize: isSm ? 11 : 13, maxWidth: 360, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
