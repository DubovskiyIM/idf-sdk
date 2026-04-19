/**
 * Countdown primitive (§6.5 backlog).
 *
 * Читает activewScheduledTimer для target.id из ctx.world.scheduledTimers
 * и рендерит HH:MM:SS до firesAt. Null, если нет active timer
 * (firedAt !== null ИЛИ timer отсутствует).
 *
 * API:
 *   <Countdown target={row} ctx={ctx} bind="__scheduledTimer" />
 *
 * `bind` — marker-поле, которое читает кастомизацию из target (например
 * конкретный timer'id), если несколько. MVP: берёт первый active.
 *
 * Token Bridge: `--idf-warning`, `--idf-text` для стилей urgency.
 */
import { useEffect, useState } from "react";

function formatRemaining(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function findActiveTimer(world, targetId, targetEntity) {
  const timers = world?.scheduledTimers || [];
  const lowerEntity = (targetEntity || "").toLowerCase();
  return timers.find(t =>
    t?.firedAt == null &&
    (t?.targetId === targetId ||
     t?.target === targetId ||
     (t?.target && t.target === `${lowerEntity}/${targetId}`))
  ) || null;
}

export function Countdown({ target, ctx, targetEntity }) {
  const timer = findActiveTimer(ctx?.world, target?.id, targetEntity);
  const firesAt = timer?.firesAt ? new Date(timer.firesAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!firesAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [firesAt]);

  if (!timer || !firesAt) return null;

  const remaining = firesAt - now;
  const urgent = remaining > 0 && remaining < 60 * 60 * 1000; // < 1h
  const color = urgent
    ? "var(--idf-warning, #b45309)"
    : "var(--idf-text-muted, #6b7280)";

  const label = timer.fireIntent ? ` до ${timer.fireIntent.replace(/_/g, " ")}` : "";

  return (
    <span
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 6,
        background: urgent ? "var(--idf-warning-bg, #fef3c7)" : "var(--idf-surface-muted, #f3f4f6)",
        color,
        fontSize: 13,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
      }}
      title={`Firing at ${new Date(firesAt).toLocaleString()}${label}`}
    >
      <span aria-hidden>⏱</span>
      <span>{formatRemaining(remaining)}{label}</span>
    </span>
  );
}
