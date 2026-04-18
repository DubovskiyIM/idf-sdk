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

function EventRowSnapshot({ event, atField, stateFields }) {
  const at = atField ? event[atField] : null;
  return (
    <div
      data-timeline-row="snapshot"
      style={{
        padding: "10px 0 10px 16px", borderLeft: "2px solid #e5e7eb",
        marginLeft: 6, position: "relative",
      }}
    >
      <span style={{
        position: "absolute", left: -5, top: 14, width: 10, height: 10,
        borderRadius: "50%", background: "#6366f1",
      }} />
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
}) {
  if (!Array.isArray(events) || events.length === 0) return null;

  return (
    <div data-timeline={kind} style={{ paddingTop: 4 }}>
      {events.map(event => (
        kind === "snapshot"
          ? <EventRowSnapshot
              key={event.id}
              event={event}
              atField={atField}
              stateFields={stateFields}
            />
          : <EventRowCausal
              key={event.id}
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
