export default function DateTimeControl({ spec, value, onChange, error }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--idf-text)" }}>
        {spec.label || spec.name}{spec.required && <span style={{ color: "var(--idf-danger, #ef4444)" }}> *</span>}
      </span>
      <input
        type="datetime-local"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: "8px 12px", borderRadius: 6,
          border: `1px solid ${error ? "var(--idf-danger, #ef4444)" : "var(--idf-border, #d1d5db)"}`,
          background: "var(--idf-surface, #fff)",
          color: "var(--idf-text, #1a1a2e)",
          fontSize: 14, outline: "none",
          colorScheme: "light dark",
        }}
      />
      {error && <span style={{ fontSize: 11, color: "var(--idf-danger, #ef4444)" }}>{error}</span>}
    </label>
  );
}
