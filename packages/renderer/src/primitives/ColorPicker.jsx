/**
 * ColorPicker — primitive для выбора цвета (HTML5 color input + hex text + random refresh).
 *
 * U-derive Phase 3.13 prerequisite (host gravitino CreateTagDialog → IntentFormDialog →
 * FormModal pipeline). Используется FormModal для `param.control === "color"` или
 * `param.type === "color"`.
 *
 * Props:
 *   - value:    string (hex, например "#0369a1") — default "#6478f7"
 *   - onChange: (hex: string) => void
 *   - disabled: boolean
 */

export const PALETTE = [
  "#0369a1", "#16a34a", "#dc2626", "#d97706",
  "#7c3aed", "#0891b2", "#db2777", "#525252",
];

export function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

const inputStyle = {
  display: "inline-block",
  padding: "6px 8px",
  fontSize: 13,
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 4,
  background: "var(--idf-surface, #fff)",
  color: "var(--idf-text)",
  fontFamily: "monospace",
  width: 140,
  boxSizing: "border-box",
};

export default function ColorPicker({ value = "#6478f7", onChange, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="color"
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        aria-label="Color picker"
        style={{
          width: 36, height: 32,
          border: "1px solid var(--idf-border, #e5e7eb)",
          borderRadius: 4,
          cursor: disabled ? "not-allowed" : "pointer",
          background: "transparent",
        }}
      />
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        aria-label="Color hex"
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => onChange?.(randomColor())}
        title="Refresh color"
        aria-label="Refresh color"
        disabled={disabled}
        style={{
          padding: "5px 8px",
          fontSize: 12,
          border: "1px solid var(--idf-border, #e5e7eb)",
          borderRadius: 4,
          background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          color: "var(--idf-text-muted)",
        }}
      >↻</button>
    </div>
  );
}
