/**
 * EventTimeline — primitive для inline отображения temporal sub-collections.
 *
 * kind="causal-chain":
 *   ● [kind-badge] actor — description              at
 *
 * kind="snapshot":
 *   ● at (heading)
 *     label1: value1 | label2: value2 | ...
 *
 * Adapter-agnostic (базовые HTML + data-атрибуты).
 */
import React from "react";

function fmtTimestamp(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("ru-RU", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function EventRowCausal({ event, atField, kindField, actorField, descriptionField }) {
  const kind = kindField ? event[kindField] : null;
  const actor = actorField ? event[actorField] : null;
  const desc = descriptionField ? event[descriptionField] : null;
  const at = atField ? event[atField] : null;

  return (
    <div
      data-timeline-row="causal-chain"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "10px 0", borderLeft: "2px solid #e5e7eb", paddingLeft: 16, marginLeft: 6,
        position: "relative",
      }}
    >
      <span style={{
        position: "absolute", left: -5, top: 14, width: 10, height: 10,
        borderRadius: "50%", background: "#6366f1",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {kind && (
          <span style={{
            display: "inline-block", padding: "2px 8px", marginRight: 8,
            background: "#eef2ff", color: "#4338ca", fontSize: 11,
            fontWeight: 600, borderRadius: 4,
          }}>
            {kind}
          </span>
        )}
        {actor && <span style={{ fontSize: 13, color: "#6b7280", marginRight: 8 }}>{actor}</span>}
        {desc && <span style={{ fontSize: 14, color: "#111827" }}>{desc}</span>}
      </div>
      {at && (
        <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
          {fmtTimestamp(at)}
        </div>
      )}
    </div>
  );
}

// Tone → CSS color для dot/border. Используется dotColorBy в snapshot rows.
const TONE_HEX = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  neutral: "#9ca3af",
  default: "#6366f1",
};

function EventRowSnapshot({ event, atField, stateFields, dotColorBy }) {
  const at = atField ? event[atField] : null;

  // §10.4c: severity-coloring для conditions timeline.
  // dotColorBy = { field, colorMap, default? } — value из event[field]
  // мапится через colorMap → tone, далее tone → hex.
  let dotColor = TONE_HEX.default;
  if (dotColorBy && typeof dotColorBy === "object" && dotColorBy.field) {
    const raw = event[dotColorBy.field];
    const tone = dotColorBy.colorMap?.[raw] || dotColorBy.default || "default";
    dotColor = TONE_HEX[tone] || TONE_HEX.default;
  }

  return (
    <div
      data-timeline-row="snapshot"
      style={{
        padding: "10px 0 10px 16px", borderLeft: "2px solid #e5e7eb",
        marginLeft: 6, position: "relative",
      }}
    >
      <span
        data-dot-color={dotColor}
        style={{
          position: "absolute", left: -5, top: 14, width: 10, height: 10,
          borderRadius: "50%", background: dotColor,
        }}
      />
      {at && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          {fmtTimestamp(at)}
        </div>
      )}
      <div style={{ fontSize: 13, color: "#4b5563", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {(stateFields || []).map(f => (
          <span key={f}>
            <span style={{ color: "#9ca3af" }}>{f}:</span>{" "}
            <span style={{ color: "#111827", fontVariantNumeric: "tabular-nums" }}>
              {event[f] ?? "—"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EventTimeline({
  events,
  kind,
  atField,
  kindField,
  actorField,
  descriptionField,
  stateFields,
  // §10.4c: severity-coloring для snapshot rows.
  // dotColorBy: { field, colorMap, default? }.
  dotColorBy,
}) {
  if (!Array.isArray(events) || events.length === 0) return null;

  return (
    <div data-timeline={kind} style={{ paddingTop: 4 }}>
      {events.map((event, idx) => (
        kind === "snapshot"
          ? <EventRowSnapshot
              key={event.id ?? `snap_${idx}`}
              event={event}
              atField={atField}
              stateFields={stateFields}
              dotColorBy={dotColorBy}
            />
          : <EventRowCausal
              key={event.id ?? `causal_${idx}`}
              event={event}
              atField={atField}
              kindField={kindField}
              actorField={actorField}
              descriptionField={descriptionField}
            />
      ))}
    </div>
  );
}
