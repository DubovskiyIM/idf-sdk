/**
 * IrreversibleBadge — визуальный маркер «эта сущность содержит необратимый
 * эффект в истории». Рендерится в detail-проекциях, чтобы пользователь
 * видел affordance «rollback невозможен».
 *
 * Spec (из проекции):
 *   { type: "irreversibleBadge" }
 *
 * Рендерится только если item имеет:
 *   - item.__irr?.point === "high" && item.__irr?.at != null   (server-style)
 *   - item.irreversibility?.point === "high" && item.irreversibility?.at != null
 *
 * Иначе — null (не занимает места).
 */

function getIrr(item) {
  if (!item) return null;
  const irr = item.__irr || item.irreversibility;
  if (!irr || typeof irr !== "object") return null;
  if (irr.point !== "high") return null;
  if (irr.at == null) return null;
  return irr;
}

export function IrreversibleBadge({ node, ctx, item }) {
  const data = item || ctx?.item;
  const irr = getIrr(data);
  if (!irr) return null;

  const reason = irr.reason || "Необратимое действие";

  return (
    <span
      role="status"
      title={reason}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: "#b91c1c",
        background: "rgba(239, 68, 68, 0.10)",
        border: "1px solid rgba(239, 68, 68, 0.35)",
      }}
    >
      <span aria-hidden="true">⚠</span>
      <span>Необратимо</span>
    </span>
  );
}
