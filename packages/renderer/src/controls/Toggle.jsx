import { resolve } from "../eval.js";
import Icon from "../adapters/Icon.jsx";

export default function Toggle({ spec, ctx }) {
  const currentState = spec.state ? resolve(ctx.world, spec.state) : false;
  const activeIntent = currentState ? spec.intents[1] : spec.intents[0];
  const icon = spec.icon?.[currentState ? "true" : "false"] || "↔";
  const label = spec.label || activeIntent;

  return (
    <button
      onClick={() => ctx.exec(activeIntent, {})}
      style={{
        padding: "6px 10px", borderRadius: 6,
        border: "1px solid var(--idf-border)",
        background: "var(--idf-card)",
        cursor: "pointer", fontSize: 12,
        display: "inline-flex", alignItems: "center", gap: 4,
      }}
      title={label}
    >
      <Icon emoji={icon} size={14} />
      <span style={{ fontSize: 11, color: "var(--idf-text-muted)" }}>{label}</span>
    </button>
  );
}
