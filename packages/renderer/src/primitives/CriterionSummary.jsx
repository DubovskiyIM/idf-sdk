/**
 * CriterionSummary — section-виджет "Оценка по критериям" с horizontal
 * bar-chart средних значений criterion-полей. Runtime compute:
 *   avg(world[pluralized(subEntity)][i][criterion]) для каждого criterion
 *   при item[fkField] === contextItem.id.
 *
 * Spec: { subEntity, fkField, criteria: [{field, label}], title? }.
 */

function pluralizeLower(entity) {
  const lower = (entity || "").toLowerCase();
  if (!lower) return "";
  if (lower.endsWith("s")) return lower;
  if (/[^aeiou]y$/i.test(lower)) return lower.slice(0, -1) + "ies";
  return lower + "s";
}

function detectScale(values) {
  // Если все values ≤ 5 — scale 5; иначе 10.
  const max = Math.max(...values);
  return max <= 5 ? 5 : 10;
}

export default function CriterionSummary({ node, ctx, item }) {
  if (!item?.id || !Array.isArray(node?.criteria) || node.criteria.length === 0) {
    return null;
  }
  const collection = pluralizeLower(node.subEntity);
  const records = ctx?.world?.[collection];
  if (!Array.isArray(records) || records.length === 0) return null;

  const filtered = records.filter(r => r && r[node.fkField] === item.id);
  if (filtered.length === 0) return null;

  const allValues = [];
  const rows = node.criteria.map(c => {
    const values = filtered
      .map(r => r[c.field])
      .filter(v => typeof v === "number" && !Number.isNaN(v));
    allValues.push(...values);
    if (values.length === 0) return { ...c, avg: null, count: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { ...c, avg, count: values.length };
  }).filter(r => r.avg !== null);

  if (rows.length === 0) return null;
  const scale = detectScale(allValues);

  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      border: "1px solid var(--idf-border)",
      background: "var(--idf-card)",
    }}>
      {node.title && (
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: "var(--idf-text)",
          marginBottom: 12,
        }}>
          {node.title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(r => {
          const pct = Math.max(0, Math.min(100, (r.avg / scale) * 100));
          const avgStr = r.avg.toFixed(1).replace(".0", "");
          return (
            <div key={r.field} style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 48px",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}>
              <span style={{ color: "var(--idf-text-muted)" }}>{r.label}</span>
              <div style={{
                height: 8,
                borderRadius: 4,
                background: "var(--idf-hover)",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "var(--idf-primary, #6366f1)",
                }} />
              </div>
              <span style={{
                textAlign: "right",
                fontWeight: 600,
                color: "var(--idf-text)",
              }}>
                {avgStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
