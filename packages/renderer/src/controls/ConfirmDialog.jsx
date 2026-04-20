import { useState } from "react";
import { ModalShell } from "./FormModal.jsx";
import { template, resolve } from "../eval.js";
import { getAdaptedComponent } from "../adapters/registry.js";

function getIrreversibilityContext(spec, item) {
  // Явная декларация intent.__irr имеет приоритет над item.__irr.
  const specIrr = spec?.__irr;
  if (specIrr && typeof specIrr === "object" && specIrr.point === "high") {
    return { point: "high", reason: specIrr.reason || null };
  }
  if (spec?.irreversibility === "high") {
    return { point: "high", reason: spec?.__irr?.reason || null };
  }
  // item.__irr — если intent уже применился и написал его в Φ (после-confirm).
  const itemIrr = item?.__irr;
  if (itemIrr?.point === "high" && itemIrr?.at) {
    return { point: "high", reason: itemIrr.reason || null };
  }
  return null;
}

export default function ConfirmDialog({ spec, ctx, overlayContext, onClose }) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const item = overlayContext?.item;

  const irr = getIrreversibilityContext(spec, item);
  const isDestructive = spec?.α === "remove" || spec?.danger === true;
  const confirmLabel = spec?.confirmLabel || (isDestructive ? "Удалить" : "Подтвердить");

  const message = template(spec.message || "Подтвердить?", { ...ctx.world, item });
  const expectedText = spec.confirmBy?.expected
    ? resolve({ ...ctx.world, item }, spec.confirmBy.expected) || spec.confirmBy.expected
    : null;

  const canConfirm =
    spec.confirmBy?.type === "typeText"
      ? typed === expectedText
      : true;

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      const params = item ? { id: item.id, entity: item } : {};
      await ctx.exec(spec.triggerIntentId, params);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const DangerBtn = getAdaptedComponent("button", "danger");
  const SecondaryBtn = getAdaptedComponent("button", "secondary");

  return (
    <ModalShell onClose={onClose} title={spec.title || "Подтверждение"}>
      {irr && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px", marginBottom: 16,
          borderRadius: 10,
          background: "rgba(255, 59, 48, 0.08)",
          border: "1px solid rgba(255, 59, 48, 0.2)",
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
          <div style={{
            fontSize: 13, lineHeight: 1.4,
            color: "#1c1c1e",
            fontFamily: "-apple-system, system-ui, sans-serif",
          }}>
            <div style={{ fontWeight: 600, marginBottom: irr.reason ? 4 : 0 }}>
              Необратимое действие
            </div>
            {irr.reason && (
              <div style={{ color: "#6b7280" }}>{irr.reason}</div>
            )}
          </div>
        </div>
      )}

      <p style={{
        fontSize: 17, color: "#1c1c1e", lineHeight: 1.5, margin: "0 0 20px",
        fontFamily: "-apple-system, system-ui, sans-serif",
        letterSpacing: "-0.41px", textAlign: "center",
      }}>
        {message}
      </p>

      {spec.confirmBy?.type === "typeText" && expectedText && (
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: "block", fontSize: 13, color: "#8e8e93", marginBottom: 6,
            fontFamily: "-apple-system, system-ui, sans-serif",
          }}>
            Введите «{expectedText}» для подтверждения:
          </label>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: "1px solid rgba(60,60,67,0.18)",
              background: "rgba(255,255,255,0.9)",
              color: "#1c1c1e", fontSize: 17, outline: "none",
              boxSizing: "border-box",
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
        {SecondaryBtn ? (
          <SecondaryBtn onClick={onClose}>Отмена</SecondaryBtn>
        ) : (
          <button onClick={onClose} style={{
            padding: "12px 24px", borderRadius: 12, border: "none",
            background: "rgba(0,122,255,0.12)", color: "#007aff",
            fontSize: 17, fontWeight: 600, cursor: "pointer",
            fontFamily: "-apple-system, system-ui, sans-serif",
          }}>Отмена</button>
        )}
        {DangerBtn && isDestructive ? (
          <DangerBtn onClick={onConfirm} disabled={!canConfirm || submitting}>
            {submitting ? "…" : confirmLabel}
          </DangerBtn>
        ) : (
          <button
            onClick={onConfirm}
            disabled={!canConfirm || submitting}
            style={{
              padding: "12px 24px", borderRadius: 12, border: "none",
              background: canConfirm
                ? (isDestructive ? "#ff3b30" : "#007aff")
                : "rgba(120,120,128,0.12)",
              color: canConfirm ? "#fff" : "#8e8e93",
              fontSize: 17, fontWeight: 600,
              cursor: canConfirm && !submitting ? "pointer" : "default",
              opacity: submitting ? 0.6 : 1,
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}
          >{submitting ? "…" : confirmLabel}</button>
        )}
      </div>
    </ModalShell>
  );
}
