/**
 * KeyValueControl — ParameterControl wrapper для KeyValueEditor primitive.
 *
 * Подключается через CONTROLS_BY_TYPE для `spec.control === "keyValue"`
 * (или для `spec.control === "object"` без `spec.values` — fallback на free-form
 * properties editor вместо typed object).
 */
import KeyValueEditor from "../primitives/KeyValueEditor.jsx";

export default function KeyValueControl({ spec, value, onChange, error }) {
  // Гарантия: внутри FormModal initial может быть "" (string) если default не задан.
  // Конвертируем в empty object чтобы primitive не сломался.
  const safeValue = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--idf-text)" }}>
        {spec.label || spec.name}
        {spec.required && <span style={{ color: "var(--idf-danger, #ef4444)" }}> *</span>}
      </span>
      <KeyValueEditor value={safeValue} onChange={onChange} disabled={spec.disabled} />
      {error && (
        <span style={{ fontSize: 11, color: "var(--idf-danger, #ef4444)" }}>{error}</span>
      )}
    </label>
  );
}
