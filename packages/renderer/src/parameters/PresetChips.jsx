/**
 * PresetChips — quick-value фичи для parameter'а (§format UI-gap #3).
 *
 * Рендерит ряд кликабельных chip'ов под input'ом. Клик на chip вызывает
 * onChange(preset.value), как если бы пользователь ввёл значение вручную.
 * Active-state подсвечивается если текущее value совпадает с preset.value.
 *
 * Spec authored как `parameter.presets: [{ label, value }]`:
 *   { name: "budget", type: "number",
 *     presets: [{ label: "500 ₽", value: 500 }, { label: "1500 ₽", value: 1500 }] }
 *
 * Authored label опционален — fallback к String(value). Для datetime можно
 * использовать relative compute-функции (spec parameter.presetBuilder
 * — future, not MVP): text-label + value как absolute timestamp.
 */
export default function PresetChips({ presets, value, onChange }) {
  if (!Array.isArray(presets) || presets.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Быстрый выбор"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 6,
      }}
    >
      {presets.map((preset, idx) => {
        const presetValue = preset?.value ?? preset;
        const label = preset?.label ?? String(presetValue);
        const isActive =
          value !== undefined && value !== null && String(value) === String(presetValue);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(presetValue)}
            aria-pressed={isActive}
            style={{
              padding: "4px 10px",
              borderRadius: 14,
              border: `1px solid ${
                isActive
                  ? "var(--idf-accent, #1677ff)"
                  : "var(--idf-border, #d1d5db)"
              }`,
              background: isActive
                ? "var(--idf-accent-soft, rgba(22, 119, 255, 0.1))"
                : "var(--idf-surface-soft, #f9fafb)",
              color: isActive
                ? "var(--idf-accent, #1677ff)"
                : "var(--idf-text-muted, #6b7280)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
