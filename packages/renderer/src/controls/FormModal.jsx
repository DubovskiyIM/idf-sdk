import { useState } from "react";
import ParameterControl from "../parameters/index.jsx";
import SlotRenderer from "../SlotRenderer.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";
import Wizard from "../primitives/Wizard.jsx";

export default function FormModal({ spec, ctx, overlayContext, onClose }) {
  const item = overlayContext?.item;

  // G-K-12 renderer follow-up: если author задекларировал bodyOverride
  // в `<entity>_edit` projection (passed через core formModal builder
  // в idf-sdk#275), dispatch'нуться на соответствующий primitive
  // вместо flat parameters list. Поддерживается:
  //   - "wizard"     → Wizard primitive со steps + breadcrumb + navigation
  //   - "tabbedForm" → simple tabbed render (basic, без primitive — proof)
  // Unknown type — fallback на flat parameters (backward-compat).
  const bodyOverride = spec?.bodyOverride;
  if (bodyOverride?.type === "wizard") {
    return (
      <ModalShell onClose={onClose} title={spec.title || spec.label || spec.intentId}>
        <Wizard
          node={bodyOverride}
          ctx={ctx}
          value={item || {}}
          onSubmit={(values) => {
            const params = item ? { id: item.id, entity: item, ...values } : values;
            const result = ctx.exec?.(spec.intentId, params);
            if (result && typeof result.then === "function") {
              result.then(onClose).catch(() => {});
            } else {
              onClose();
            }
          }}
        />
      </ModalShell>
    );
  }
  if (bodyOverride?.type === "tabbedForm") {
    return (
      <ModalShell onClose={onClose} title={spec.title || spec.label || spec.intentId}>
        <TabbedFormBody
          spec={bodyOverride}
          item={item}
          ctx={ctx}
          intentId={spec.intentId}
          onClose={onClose}
        />
      </ModalShell>
    );
  }

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

/**
 * G-K-12 renderer: minimal TabbedForm impl — рендерит tabs с переключением
 * и aggregated submit. Не отдельный primitive (пока) — inline в FormModal.
 */
function TabbedFormBody({ spec, item, ctx, intentId, onClose }) {
  const tabs = Array.isArray(spec?.tabs) ? spec.tabs : [];
  const initial = {};
  for (const tab of tabs) {
    for (const f of tab.fields || []) {
      const fname = typeof f === "string" ? f : f.name;
      if (fname && item && item[fname] !== undefined) {
        initial[fname] = item[fname];
      }
    }
  }
  const [values, setValues] = useState(initial);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || null);
  const [submitting, setSubmitting] = useState(false);
  const PrimaryBtn = getAdaptedComponent("button", "primary");
  const SecondaryBtn = getAdaptedComponent("button", "secondary");

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const params = item ? { id: item.id, entity: item, ...values } : values;
      await ctx.exec?.(intentId, params);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const activeTabSpec = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div>
      <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--idf-border, #e5e7eb)", marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 12px", border: "none", background: "transparent",
              borderBottom: tab.id === activeTab ? "2px solid var(--idf-accent, #4f46e5)" : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
              color: tab.id === activeTab ? "var(--idf-accent, #4f46e5)" : "var(--idf-text-muted, #6b7280)",
              fontWeight: tab.id === activeTab ? 600 : 400,
            }}
          >{tab.title || tab.id}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(activeTabSpec?.fields || []).map(f => {
          const fname = typeof f === "string" ? f : f.name;
          const fSpec = typeof f === "string" ? { name: f, type: "text" } : f;
          return (
            <ParameterControl
              key={fname}
              spec={{ ...fSpec, editable: true }}
              value={values[fname] ?? ""}
              onChange={v => setValues(p => ({ ...p, [fname]: v }))}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        {SecondaryBtn ? <SecondaryBtn onClick={onClose}>Отмена</SecondaryBtn>
          : <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--idf-border)", background: "var(--idf-card)", cursor: "pointer", fontSize: 15 }}>Отмена</button>}
        {PrimaryBtn ? <PrimaryBtn onClick={onSubmit} disabled={submitting}>{submitting ? "…" : "Сохранить"}</PrimaryBtn>
          : <button onClick={onSubmit} disabled={submitting} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--idf-accent)", color: "#fff", cursor: submitting ? "default" : "pointer", fontSize: 15 }}>{submitting ? "…" : "Сохранить"}</button>}
      </div>
    </div>
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
