/**
 * UndoToast primitive — soft-cancel окно после destructive intent.
 *
 * Shape: { type:"undoToast", intentId, inverseIntentId, windowSec, message? }.
 * Спецификация генерируется SDK-паттерном `undo-toast-window` в
 * `slots.overlay`. Рендерер наблюдает за событиями effect:confirmed для
 * intentId и при fire показывает toast с countdown + «Отменить».
 *
 * API:
 *   <UndoToast spec={spec} ctx={ctx} triggered={intentId|null} />
 *
 * `triggered` — signal от runtime, что intentId только что applied.
 * Host (idf/standalone) хранит state последнего applied intent и передаёт
 * в primitive; после истечения windowSec toast dismiss'ится.
 *
 * Клик «Отменить» → ctx.exec(inverseIntentId) + onDismiss.
 */
import { useEffect, useState } from "react";

export function UndoToast({ spec, ctx, triggered, onDismiss }) {
  const active = triggered === spec?.intentId;
  const windowMs = (spec?.windowSec || 7) * 1000;
  const [remaining, setRemaining] = useState(windowMs);

  useEffect(() => {
    if (!active) {
      setRemaining(windowMs);
      return;
    }
    setRemaining(windowMs);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const left = windowMs - (Date.now() - startedAt);
      if (left <= 0) {
        clearInterval(interval);
        setRemaining(0);
        onDismiss?.();
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [active, windowMs, onDismiss]);

  if (!active || remaining <= 0) return null;

  const secondsLeft = Math.ceil(remaining / 1000);
  const progressPct = (remaining / windowMs) * 100;
  const message = spec?.message || "Действие применено";

  const handleUndo = () => {
    if (ctx?.exec && spec?.inverseIntentId) {
      ctx.exec(spec.inverseIntentId, {});
    }
    onDismiss?.();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--idf-text, #111827)",
        color: "var(--idf-surface, #fff)",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        fontSize: 13,
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <span>{message}</span>
      <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
        {secondsLeft}с
      </span>
      <button
        type="button"
        onClick={handleUndo}
        style={{
          background: "transparent",
          border: "1px solid var(--idf-surface-muted, rgba(255,255,255,.3))",
          color: "inherit",
          padding: "4px 10px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Отменить
      </button>
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          width: `${progressPct}%`,
          background: "var(--idf-accent, #6366f1)",
          transition: "width 100ms linear",
        }}
      />
    </div>
  );
}
