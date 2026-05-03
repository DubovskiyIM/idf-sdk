/**
 * ColorControl — ParameterControl wrapper для ColorPicker primitive.
 *
 * Подключается через CONTROLS_BY_TYPE для `spec.control === "color"`
 * (или legacy `spec.type === "color"` если author ещё не мигрировал на canonical
 * field). FormModal автоматически рендерит этот control.
 */
import ColorPicker from "../primitives/ColorPicker.jsx";

export default function ColorControl({ spec, value, onChange, error }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--idf-text)" }}>
        {spec.label || spec.name}
        {spec.required && <span style={{ color: "var(--idf-danger, #ef4444)" }}> *</span>}
      </span>
      <ColorPicker
        value={value && typeof value === "string" && value.startsWith("#") ? value : (spec.default || "#6478f7")}
        onChange={onChange}
        disabled={spec.disabled}
      />
      {error && (
        <span style={{ fontSize: 11, color: "var(--idf-danger, #ef4444)" }}>{error}</span>
      )}
    </label>
  );
}
