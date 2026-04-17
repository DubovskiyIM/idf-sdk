import { useState } from "react";
import ParameterControl from "../parameters/index.jsx";
import SlotRenderer from "../SlotRenderer.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";

export default function FormModal({ spec, ctx, overlayContext, onClose }) {
  const item = overlayContext?.item;

  // Предзаполнение из item: (1) editable параметры, (2) любой per-item параметр
  // если item содержит поле с тем же именем (edit_message.content ← item.content)
  const initial = {};
  for (const p of spec.parameters || []) {
    const fieldName = p.bind ? p.bind.split(".").pop() : p.name;
    if (item && (p.editable || item[fieldName] !== undefined)) {
      initial[p.name] = item[fieldName] ?? p.default ?? "";
    } else {
      initial[p.name] = p.default ?? "";
    }
  }
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const newErrors = {};
    for (const p of spec.parameters || []) {
      if (p.required && !values[p.name]) newErrors[p.name] = "Обязательное поле";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Если это per-item overlay — включить id сущности в параметры exec.
      const params = item ? { id: item.id, entity: item, ...values } : values;
      await ctx.exec(spec.intentId, params);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Адаптерные кнопки
  const PrimaryBtn = getAdaptedComponent("button", "primary");
  const SecondaryBtn = getAdaptedComponent("button", "secondary");

  return (
    <ModalShell onClose={onClose} title={spec.title || spec.label || spec.intentId}>
      {spec.witnessPanel?.length > 0 && (
        <div style={{ padding: 12, background: "var(--idf-hover)", borderRadius: 8, marginBottom: 16 }}>
          {spec.witnessPanel.map((w, i) => (
            <SlotRenderer key={i} item={w} ctx={ctx} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(spec.parameters || []).map(param => {
          // visibleWhen: условная видимость поля
          if (param.visibleWhen) {
            const { field, value } = param.visibleWhen;
            if (values[field] !== value) return null;
          }
          // entityRef → select с options из world
          let enrichedParam = param;
          if (param.control === "select" && !param.options && param.name?.endsWith("Id")) {
            const refName = param.name.replace(/Id$/, "").toLowerCase();
            const collName = refName.endsWith("y") ? refName.slice(0, -1) + "ies"
              : refName.endsWith("s") ? refName + "es" : refName + "s";
            const items = ctx.world?.[collName] || [];
            if (items.length > 0) {
              enrichedParam = {
                ...param,
                options: items.map(it => ({
                  value: it.id,
                  label: it.icon ? `${it.icon} ${it.name || it.title || it.id}` : (it.name || it.title || it.id),
                })),
              };
            }
          }
          return (
            <ParameterControl
              key={param.name}
              spec={enrichedParam}
              value={values[param.name]}
              onChange={v => setValues(p => ({ ...p, [param.name]: v }))}
              error={errors[param.name]}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        {SecondaryBtn ? (
          <SecondaryBtn onClick={onClose}>Отмена</SecondaryBtn>
        ) : (
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", borderRadius: "var(--idf-radius, 8px)",
              border: "1px solid var(--idf-border)",
              background: "var(--idf-card)",
              color: "var(--idf-text)",
              cursor: "pointer", fontSize: 15, fontWeight: 500,
              fontFamily: "var(--idf-font, system-ui)",
            }}
          >Отмена</button>
        )}
        {PrimaryBtn ? (
          <PrimaryBtn onClick={onSubmit} disabled={submitting}>
            {submitting ? "…" : (item ? "Сохранить" : "Создать")}
          </PrimaryBtn>
        ) : (
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: "10px 20px", borderRadius: "var(--idf-radius, 8px)",
              border: "none",
              background: "var(--idf-accent)", color: "#fff",
              cursor: submitting ? "default" : "pointer",
              fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1,
              fontFamily: "var(--idf-font, system-ui)",
            }}
          >{submitting ? "…" : (item ? "Сохранить" : "Создать")}</button>
        )}
      </div>
    </ModalShell>
  );
}

export function ModalShell({ children, onClose, title }) {
  // Сначала пробуем адаптер (Mantine Modal). Адаптер сам обеспечивает
  // открытое состояние, анимации, поверхность и поведение close.
  const AdaptedModal = getAdaptedComponent("shell", "modal");
  if (AdaptedModal) {
    return (
      <AdaptedModal onClose={onClose} title={title}>
        {children}
      </AdaptedModal>
    );
  }

  // Fallback: inline-стилизованный модал.
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "#0008",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--idf-surface)", borderRadius: 12, padding: 20,
          minWidth: 360, maxWidth: 560, maxHeight: "80vh", overflow: "auto",
          boxShadow: "0 20px 50px #0004",
        }}
      >
        {title && <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
