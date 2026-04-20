/**
 * RatingAggregate — inline hero-widget "⭐ 4.9 · 128 отзывов".
 * Ищет в ctx.world[pluralizedSubEntity] записи с item[fkField] === contextItem.id,
 * вычисляет avg + count по ratingField. Пустой subcollection → null (не рендерит).
 *
 * Spec: { subEntity, fkField, ratingField, countLabel }.
 */

function pluralizeLower(entity) {
  const lower = (entity || "").toLowerCase();
  if (!lower) return "";
  if (lower.endsWith("s")) return lower;
  if (/[^aeiou]y$/i.test(lower)) return lower.slice(0, -1) + "ies";
  return lower + "s";
}

function declension(n, forms) {
  // forms: ["отзыв", "отзыва", "отзывов"]
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

const LABEL_FORMS = {
  "отзывов": ["отзыв", "отзыва", "отзывов"],
  "оценок": ["оценка", "оценки", "оценок"],
};

export default function RatingAggregate({ node, ctx, item }) {
  if (!item?.id) return null;
  const collectionName = pluralizeLower(node.subEntity);
  const records = ctx?.world?.[collectionName];
  if (!Array.isArray(records) || records.length === 0) return null;

  const filtered = records.filter(r => r && r[node.fkField] === item.id);
  if (filtered.length === 0) return null;

  const values = filtered
    .map(r => r[node.ratingField])
    .filter(v => typeof v === "number" && !Number.isNaN(v));
  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgStr = avg.toFixed(1).replace(".0", "");
  const count = values.length;

  const forms = LABEL_FORMS[node.countLabel];
  const labelStr = forms ? declension(count, forms) : (node.countLabel || "");

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      color: "var(--idf-text)",
    }}>
      <span style={{ fontSize: 16 }}>⭐</span>
      <span style={{ fontWeight: 600 }}>{avgStr}</span>
      <span style={{ color: "var(--idf-text-muted)" }}>·</span>
      <span style={{ color: "var(--idf-text-muted)" }}>
        {count} {labelStr}
      </span>
    </div>
  );
}
