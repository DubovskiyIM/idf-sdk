import { useState, useMemo, useCallback } from "react";

/**
 * Wizard — multi-step form primitive с provider/discriminator-dependent
 * шагами и async `test-connection` actions. Classical enterprise
 * pattern: choose-type → configure → test → submit.
 *
 * Shape:
 *   {
 *     type: "wizard",
 *     steps: [
 *       { id: "type",     title: "Type",      fields: [...] },
 *       { id: "provider", title: "Provider",  fields: [...], dependsOn: { type: "relational" } },
 *       { id: "config",   title: "Config",    fields: [...], dependsOn: {}, testConnection: { intent: "testConnection" } },
 *       { id: "props",    title: "Properties", fields: [...] },
 *     ],
 *     value: {}, // initial state for all fields
 *     onSubmit(values) => ...,
 *   }
 *
 * Каждый шаг имеет:
 *   - id / title
 *   - fields: массив { name, label, type, required?, options?, placeholder? }
 *   - dependsOn: объект {field: expectedValue} — шаг активен только если
 *     ВСЕ условия в previous-state удовлетворены. Иначе пропускается.
 *   - testConnection (опц.): { intent: string, label?: "Test Connection" }
 *     показывает button с async-validation. State: idle / loading / ok / error.
 *
 * Navigation: Next / Back buttons, Submit на последнем активном шаге.
 * Visited steps показываются как breadcrumb naverху.
 *
 * Adapter delegation:
 *   ctx.adapter.getComponent("primitive", "wizard")
 *   ctx.testConnection(intent, values): Promise<{ok: boolean, message?: string}>
 */
export default function Wizard({ node, ctx, value: initialValue, onSubmit }) {
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "wizard");
  if (Adapted) {
    return <Adapted node={node} ctx={ctx} value={initialValue} onSubmit={onSubmit} />;
  }

  const steps = Array.isArray(node?.steps) ? node.steps : [];
  const [values, setValues] = useState(initialValue || node?.value || {});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Фильтрация steps по dependsOn-conditions (evaluated on current values)
  const activeSteps = useMemo(() => {
    return steps.filter(step => {
      const cond = step.dependsOn;
      if (!cond || typeof cond !== "object") return true;
      for (const [k, expected] of Object.entries(cond)) {
        if (values[k] !== expected) return false;
      }
      return true;
    });
  }, [steps, values]);

  // clamp currentIdx
  const safeCurrentIdx = Math.min(currentIdx, Math.max(activeSteps.length - 1, 0));
  const currentStep = activeSteps[safeCurrentIdx];
  const isLast = safeCurrentIdx === activeSteps.length - 1;
  const isFirst = safeCurrentIdx === 0;

  const setField = useCallback((name, newValue) => {
    setValues(cur => ({ ...cur, [name]: newValue }));
  }, []);

  const next = useCallback(() => {
    setCurrentIdx(i => Math.min(i + 1, activeSteps.length - 1));
  }, [activeSteps.length]);

  const back = useCallback(() => {
    setCurrentIdx(i => Math.max(i - 1, 0));
  }, []);

  const submit = useCallback(() => {
    if (onSubmit) onSubmit(values);
  }, [onSubmit, values]);

  if (steps.length === 0) {
    return <div style={emptyStyle}>Нет шагов</div>;
  }

  return (
    <div style={rootStyle}>
      {/* Step progress */}
      <div style={progressStyle}>
        {activeSteps.map((step, i) => (
          <div key={step.id || i} style={progressStepStyle(i, safeCurrentIdx)}>
            <div style={progressBadgeStyle(i, safeCurrentIdx)}>{i + 1}</div>
            <div style={progressLabelStyle(i === safeCurrentIdx)}>{step.title || step.id || `Step ${i + 1}`}</div>
            {i < activeSteps.length - 1 && <div style={progressLineStyle(i < safeCurrentIdx)} />}
          </div>
        ))}
      </div>

      {/* Step body */}
      {currentStep && (
        <StepBody
          step={currentStep}
          values={values}
          onField={setField}
          ctx={ctx}
        />
      )}

      {/* Navigation */}
      <div style={navStyle}>
        <button
          type="button"
          onClick={back}
          disabled={isFirst}
          style={secondaryButtonStyle(isFirst)}
        >
          ← Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            style={primaryButtonStyle}
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            style={primaryButtonStyle}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function StepBody({ step, values, onField, ctx }) {
  const fields = Array.isArray(step.fields) ? step.fields : [];
  return (
    <div style={stepBodyStyle}>
      {step.description && <p style={stepDescStyle}>{step.description}</p>}
      {fields.map(field => (
        <FieldRow
          key={field.name}
          field={field}
          value={values[field.name] ?? ""}
          onChange={(v) => onField(field.name, v)}
        />
      ))}
      {step.testConnection && (
        <TestConnectionControl
          spec={step.testConnection}
          values={values}
          ctx={ctx}
        />
      )}
    </div>
  );
}

function FieldRow({ field, value, onChange }) {
  const inputId = `wz-field-${field.name}`;
  const common = {
    id: inputId,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    placeholder: field.placeholder,
    style: inputStyle,
  };
  let input;
  if (field.type === "select" && Array.isArray(field.options)) {
    input = (
      <select {...common}>
        <option value="">—</option>
        {field.options.map(opt => {
          const v = typeof opt === "object" ? opt.value : opt;
          const label = typeof opt === "object" ? opt.label : opt;
          return <option key={v} value={v}>{label}</option>;
        })}
      </select>
    );
  } else if (field.type === "textarea") {
    input = <textarea {...common} rows={3} />;
  } else if (field.type === "number") {
    input = <input type="number" {...common} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
  } else if (field.type === "boolean") {
    input = (
      <input
        id={inputId}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  } else {
    input = <input type="text" {...common} />;
  }
  return (
    <div style={fieldRowStyle}>
      <label htmlFor={inputId} style={labelStyle}>
        {field.label || field.name}
        {field.required && <span style={requiredMarkStyle}> *</span>}
      </label>
      {input}
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function TestConnectionControl({ spec, values, ctx }) {
  const [state, setState] = useState({ status: "idle" }); // idle | loading | ok | error

  const run = useCallback(async () => {
    setState({ status: "loading" });
    try {
      if (typeof ctx?.testConnection !== "function") {
        setState({ status: "error", message: "ctx.testConnection не реализован" });
        return;
      }
      const result = await ctx.testConnection(spec.intent, values);
      if (result?.ok) {
        setState({ status: "ok", message: result.message || "Соединение успешно" });
      } else {
        setState({ status: "error", message: result?.message || "Ошибка соединения" });
      }
    } catch (err) {
      setState({ status: "error", message: err?.message || String(err) });
    }
  }, [spec.intent, values, ctx]);

  const label = spec.label || "Test Connection";
  return (
    <div style={testConnStyle}>
      <button
        type="button"
        onClick={run}
        disabled={state.status === "loading"}
        style={testConnButtonStyle(state.status)}
      >
        {state.status === "loading" ? "Проверка…" : label}
      </button>
      {state.status === "ok" && (
        <span style={testConnOkStyle}>✓ {state.message}</span>
      )}
      {state.status === "error" && (
        <span style={testConnErrStyle}>✗ {state.message}</span>
      )}
    </div>
  );
}

const rootStyle = {
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 8,
  background: "var(--idf-card, #fff)",
  padding: 16,
  fontFamily: "inherit",
  fontSize: 13,
};

const progressStyle = {
  display: "flex",
  alignItems: "center",
  gap: 0,
  marginBottom: 20,
};

const progressStepStyle = (i, current) => ({
  display: "flex",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
  opacity: i === current ? 1 : 0.6,
});

const progressBadgeStyle = (i, current) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 12,
  background: i <= current ? "var(--idf-accent, #2563eb)" : "var(--idf-bg-subtle, #e5e7eb)",
  color: i <= current ? "#fff" : "var(--idf-text-muted, #6b7280)",
  fontSize: 12,
  fontWeight: 600,
  flexShrink: 0,
});

const progressLabelStyle = (current) => ({
  marginLeft: 8,
  fontSize: 12,
  fontWeight: current ? 600 : 400,
  color: "var(--idf-text, #1a1a2e)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const progressLineStyle = (filled) => ({
  flex: 1,
  height: 2,
  background: filled ? "var(--idf-accent, #2563eb)" : "var(--idf-border, #e5e7eb)",
  margin: "0 8px",
});

const stepBodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginBottom: 20,
};

const stepDescStyle = {
  color: "var(--idf-text-muted, #6b7280)",
  margin: 0,
  fontSize: 12,
};

const fieldRowStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--idf-text, #1a1a2e)",
};

const requiredMarkStyle = {
  color: "var(--idf-danger, #dc2626)",
};

const inputStyle = {
  padding: "6px 10px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "inherit",
  background: "var(--idf-card, #fff)",
};

const hintStyle = {
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
};

const testConnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 8,
};

const testConnButtonStyle = (status) => ({
  padding: "6px 12px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: status === "loading"
    ? "var(--idf-bg-subtle, #f3f4f6)"
    : "var(--idf-card, #fff)",
  cursor: status === "loading" ? "wait" : "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--idf-text, #1a1a2e)",
});

const testConnOkStyle = {
  color: "var(--idf-success, #059669)",
  fontSize: 12,
  fontWeight: 500,
};

const testConnErrStyle = {
  color: "var(--idf-danger, #dc2626)",
  fontSize: 12,
  fontWeight: 500,
};

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  paddingTop: 16,
  borderTop: "1px solid var(--idf-border-subtle, #f3f4f6)",
};

const primaryButtonStyle = {
  padding: "6px 16px",
  border: "none",
  borderRadius: 4,
  background: "var(--idf-accent, #2563eb)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const secondaryButtonStyle = (disabled) => ({
  padding: "6px 16px",
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 4,
  background: "var(--idf-card, #fff)",
  color: disabled ? "var(--idf-text-muted, #9ca3af)" : "var(--idf-text, #1a1a2e)",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
});

const emptyStyle = {
  padding: 16,
  color: "var(--idf-text-muted, #9ca3af)",
  fontStyle: "italic",
  textAlign: "center",
};
