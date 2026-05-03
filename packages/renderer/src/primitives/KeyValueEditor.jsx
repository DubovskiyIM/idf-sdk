/**
 * KeyValueEditor — primitive для редактирования key/value pairs.
 *
 * U-derive Phase 3.13 prerequisite (host gravitino properties в CreateTagDialog /
 * CreatePolicyDialog → IntentFormDialog → FormModal pipeline). Используется FormModal
 * для `param.control === "keyValue"` (или `type === "object"` без `values`).
 *
 * Value contract:
 *   - value:    plain object { [key: string]: string }
 *   - onChange: (object) => void — отдаёт plain object (не array of pairs)
 *
 * Внутреннее представление — array of {key, value} с локальным state, чтобы:
 *   1. сохранять stable focus при keystroke (input keys не меняются);
 *   2. поддерживать pending-empty rows (user нажал "+", но ещё не ввёл key) —
 *      они existуют в UI, но не emit'ятся в parent value (filtered out).
 */
import { useEffect, useState } from "react";

const inputStyle = {
  flex: 1,
  padding: "6px 8px",
  fontSize: 13,
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 4,
  background: "var(--idf-surface, #fff)",
  color: "var(--idf-text)",
  boxSizing: "border-box",
};

const toRows = (obj) => {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return [{ key: "", value: "" }];
  return entries.map(([k, v]) => ({ key: k, value: v == null ? "" : String(v) }));
};

const toObject = (rows) =>
  Object.fromEntries(
    rows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value])
  );

export default function KeyValueEditor({ value = {}, onChange, disabled }) {
  // Local state поддерживает pending-empty rows (key === "") которые не входят
  // в parent value object. Sync from parent при первой инициализации; после
  // каждого user-edit мы сами обновляем local rows + emit cleaned object.
  const [rows, setRows] = useState(() => toRows(value));

  // Re-sync если parent value изменился извне (controlled-friendly), но только
  // когда внешний object не равен cleaned local representation (иначе зациклимся).
  useEffect(() => {
    const cleaned = toObject(rows);
    const parentKeys = Object.keys(value || {});
    const cleanedKeys = Object.keys(cleaned);
    const sameKeys =
      parentKeys.length === cleanedKeys.length &&
      parentKeys.every(k => cleaned[k] === value[k]);
    if (!sameKeys) {
      setRows(toRows(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (next) => {
    setRows(next);
    onChange?.(toObject(next));
  };

  const setRow = (i, key, val) =>
    update(rows.map((r, ix) => (ix === i ? { key, value: val } : r)));

  const remove = (i) => {
    const next = rows.filter((_, ix) => ix !== i);
    // Если удалили последний row — оставляем один пустой для UI.
    update(next.length === 0 ? [{ key: "", value: "" }] : next);
  };

  const add = () => update([...rows, { key: "", value: "" }]);

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={row.key}
            onChange={e => setRow(i, e.target.value, row.value)}
            placeholder="Key"
            disabled={disabled}
            aria-label={`Key ${i}`}
            style={inputStyle}
          />
          <input
            type="text"
            value={row.value}
            onChange={e => setRow(i, row.key, e.target.value)}
            placeholder="Value"
            disabled={disabled}
            aria-label={`Value ${i}`}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            title="Remove"
            aria-label={`Remove ${i}`}
            disabled={disabled}
            style={{
              padding: "0 10px",
              fontSize: 14,
              border: "1px solid var(--idf-border, #e5e7eb)",
              background: "transparent",
              color: "var(--idf-text-muted)",
              borderRadius: 4,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >−</button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        style={{
          padding: "5px 10px",
          fontSize: 11,
          border: "1px dashed var(--idf-border, #e5e7eb)",
          borderRadius: 4,
          background: "transparent",
          color: "var(--idf-text-muted)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >+ Add Property</button>
    </div>
  );
}
