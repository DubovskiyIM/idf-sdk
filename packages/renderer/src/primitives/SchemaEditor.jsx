import { useCallback } from "react";

/**
 * SchemaEditor — render/edit списка column-определений с composite types.
 *
 * Shape value (array of column defs):
 *   [
 *     { name: "id",         type: "bigint",         nullable: false, comment: "primary key" },
 *     { name: "email",      type: "varchar", length: 320, nullable: true },
 *     { name: "balance",    type: "decimal", precision: 10, scale: 2 },
 *     { name: "created_at", type: "timestamp",      nullable: false },
 *   ]
 *
 * Props:
 *   - value: array (если undefined — []). Нечитаемые формы (строка / object
 *     без name) фильтруются.
 *   - onChange(next): новый массив. Если primitive read-only — не вызывается.
 *   - readOnly: bool (default false).
 *   - ctx: {adapter?}, если адаптер даёт
 *     `getComponent("primitive","schemaEditor")` — делегируем рендер.
 *
 * Адаптер может override целиком через ctx.adapter — иначе используется
 * minimal built-in UI с table-layout (name / type / params / nullable /
 * comment) + add/remove row buttons в edit-mode.
 *
 * Supported primitive types: varchar, decimal, string, bigint, integer,
 * boolean, timestamp, date. Расширение на list/map/struct/union —
 * отдельный PR (nesting UI требует separate design).
 */
export default function SchemaEditor({ value, onChange, readOnly = false, ctx }) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "schemaEditor");
  if (Adapted) {
    return <Adapted value={value} onChange={onChange} readOnly={readOnly} ctx={ctx} />;
  }

  const rows = Array.isArray(value)
    ? value.filter(r => r && typeof r === "object" && typeof r.name === "string")
    : [];

  const setRow = useCallback((idx, patch) => {
    if (readOnly || !onChange) return;
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  }, [rows, onChange, readOnly]);

  const removeRow = useCallback((idx) => {
    if (readOnly || !onChange) return;
    onChange(rows.filter((_, i) => i !== idx));
  }, [rows, onChange, readOnly]);

  const addRow = useCallback(() => {
    if (readOnly || !onChange) return;
    onChange([...rows, { name: "", type: "string", nullable: true }]);
  }, [rows, onChange, readOnly]);

  if (rows.length === 0 && readOnly) {
    return <div style={emptyStyle}>Нет колонок</div>;
  }

  return (
    <div style={rootStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headCellStyle}>Name</th>
            <th style={headCellStyle}>Type</th>
            <th style={headCellStyle}>Params</th>
            <th style={headCellStyle}>Nullable</th>
            <th style={headCellStyle}>Comment</th>
            {!readOnly && <th style={headCellStyle} aria-label="actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <ColumnRow
              key={i}
              row={row}
              readOnly={readOnly}
              onChange={(patch) => setRow(i, patch)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button type="button" onClick={addRow} style={addButtonStyle}>
          + Add column
        </button>
      )}
    </div>
  );
}

const KNOWN_TYPES = [
  "string", "varchar", "char", "text",
  "integer", "bigint", "smallint", "tinyint",
  "decimal", "float", "double",
  "boolean", "timestamp", "date", "time", "binary",
];

// Типы с параметрами: варьируется форма parametric-inputs.
const TYPES_WITH_LENGTH = new Set(["varchar", "char"]);
const TYPES_WITH_PRECISION = new Set(["decimal"]);

function ColumnRow({ row, readOnly, onChange, onRemove }) {
  const type = typeof row.type === "string" ? row.type.toLowerCase() : "string";
  const isVarchar = TYPES_WITH_LENGTH.has(type);
  const isDecimal = TYPES_WITH_PRECISION.has(type);

  const paramsCell = (() => {
    if (isVarchar) {
      return readOnly
        ? <span style={paramTextStyle}>{row.length != null ? `(${row.length})` : ""}</span>
        : (
          <input
            type="number"
            min={1}
            value={row.length ?? ""}
            onChange={(e) => onChange({ length: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="length"
            style={numberInputStyle}
          />
        );
    }
    if (isDecimal) {
      return readOnly
        ? (
          <span style={paramTextStyle}>
            {row.precision != null
              ? `(${row.precision}${row.scale != null ? `,${row.scale}` : ""})`
              : ""}
          </span>
        )
        : (
          <span style={{ display: "inline-flex", gap: 4 }}>
            <input
              type="number" min={1} value={row.precision ?? ""}
              onChange={(e) => onChange({ precision: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="p" style={smallNumberInputStyle}
            />
            <input
              type="number" min={0} value={row.scale ?? ""}
              onChange={(e) => onChange({ scale: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="s" style={smallNumberInputStyle}
            />
          </span>
        );
    }
    return <span style={paramTextStyle}>—</span>;
  })();

  const nullableCell = readOnly
    ? <span>{row.nullable === false ? "✗" : "✓"}</span>
    : (
      <input
        type="checkbox"
        checked={row.nullable !== false}
        onChange={(e) => onChange({ nullable: e.target.checked })}
      />
    );

  return (
    <tr style={bodyRowStyle}>
      <td style={bodyCellStyle}>
        {readOnly
          ? <span style={{ fontWeight: 600 }}>{row.name}</span>
          : (
            <input
              type="text" value={row.name ?? ""}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="column name" style={textInputStyle}
            />
          )}
      </td>
      <td style={bodyCellStyle}>
        {readOnly
          ? <code style={typeBadgeStyle}>{row.type || "string"}</code>
          : (
            <select
              value={type}
              onChange={(e) => onChange({ type: e.target.value })}
              style={selectStyle}
            >
              {KNOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
      </td>
      <td style={bodyCellStyle}>{paramsCell}</td>
      <td style={{ ...bodyCellStyle, textAlign: "center" }}>{nullableCell}</td>
      <td style={bodyCellStyle}>
        {readOnly
          ? <span style={commentStyle}>{row.comment || ""}</span>
          : (
            <input
              type="text" value={row.comment ?? ""}
              onChange={(e) => onChange({ comment: e.target.value })}
              placeholder="comment" style={textInputStyle}
            />
          )}
      </td>
      {!readOnly && (
        <td style={bodyCellStyle}>
          <button type="button" onClick={onRemove} style={removeButtonStyle} aria-label="Remove column">×</button>
        </td>
      )}
    </tr>
  );
}

const rootStyle = {
  fontSize: 13,
  fontFamily: "inherit",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--idf-card, #fff)",
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 6,
  overflow: "hidden",
};

const headCellStyle = {
  textAlign: "left",
  padding: "8px 10px",
  background: "var(--idf-bg-subtle, #f9fafb)",
  borderBottom: "1px solid var(--idf-border, #e5e7eb)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "var(--idf-text-muted, #6b7280)",
};

const bodyRowStyle = {
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
};

const bodyCellStyle = {
  padding: "6px 10px",
  verticalAlign: "middle",
};

const textInputStyle = {
  width: "100%",
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  fontSize: 13,
};

const numberInputStyle = {
  width: 70,
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  fontSize: 13,
};

const smallNumberInputStyle = {
  width: 44,
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  fontSize: 13,
};

const selectStyle = {
  padding: "3px 6px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  fontSize: 13,
  background: "var(--idf-card, #fff)",
};

const typeBadgeStyle = {
  fontSize: 12,
  background: "var(--idf-bg-subtle, #eef2f7)",
  padding: "2px 6px",
  borderRadius: 3,
  color: "var(--idf-text, #1a1a2e)",
};

const paramTextStyle = {
  color: "var(--idf-text-muted, #6b7280)",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
};

const commentStyle = {
  color: "var(--idf-text-muted, #6b7280)",
  fontSize: 12,
};

const emptyStyle = {
  padding: "12px 16px",
  color: "var(--idf-text-muted, #9ca3af)",
  fontSize: 13,
  fontStyle: "italic",
  textAlign: "center",
};

const addButtonStyle = {
  marginTop: 8,
  padding: "6px 12px",
  border: "1px dashed var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--idf-text-muted, #6b7280)",
};

const removeButtonStyle = {
  padding: "2px 8px",
  border: "none",
  background: "transparent",
  color: "var(--idf-text-muted, #9ca3af)",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
};
