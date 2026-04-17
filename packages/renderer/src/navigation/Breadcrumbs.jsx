export default function Breadcrumbs({ history, current, canGoBack, onBack, projectionNames }) {
  if (!current) return null;

  const names = projectionNames || {};
  const crumbs = [...history, current];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px",
      background: "var(--idf-card)",
      borderBottom: "1px solid var(--idf-border)",
      fontSize: 13,
      color: "var(--idf-text-muted)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {canGoBack && (
        <button
          onClick={onBack}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid var(--idf-border)",
            background: "var(--idf-hover)",
            color: "var(--idf-text)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >← Назад</button>
      )}
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const name = names[crumb.projectionId] || crumb.projectionId;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{
              color: isLast ? "var(--idf-text)" : "var(--idf-text-muted)",
              fontWeight: isLast ? 600 : 400,
            }}>
              {name}
            </span>
            {!isLast && <span style={{ color: "var(--idf-text-muted)" }}>/</span>}
          </span>
        );
      })}
    </div>
  );
}
