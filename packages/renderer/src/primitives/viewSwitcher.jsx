/**
 * ViewSwitcher — primitive для переключения views в multi-archetype projection.
 *
 * variant='auto' (default): tabs при views.length <= 3, иначе dropdown.
 *
 * Adapter-agnostic: базовые html с data-атрибутами для стилизации.
 */
import React from "react";

export function ViewSwitcher({ views, activeId, onChange, variant = "auto" }) {
  if (!Array.isArray(views) || views.length < 2) return null;

  const effectiveVariant = variant === "auto" ? (views.length <= 3 ? "tabs" : "dropdown") : variant;

  if (effectiveVariant === "dropdown") {
    return (
      <select
        value={activeId || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
      >
        {views.map(v => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ display: "inline-flex", gap: 0, background: "#f3f4f6", padding: 2, borderRadius: 8 }}>
      {views.map(v => {
        const active = v.id === activeId;
        return (
          <button
            key={v.id}
            type="button"
            data-active={active ? "true" : "false"}
            onClick={() => onChange(v.id)}
            style={{
              padding: "6px 12px",
              border: "none",
              background: active ? "#fff" : "transparent",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {v.name}
          </button>
        );
      })}
    </div>
  );
}
