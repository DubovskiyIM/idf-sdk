import { useState, useMemo } from "react";
import ParameterControl from "../parameters/index.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";

/**
 * TabbedForm — form-primitive для enterprise-config entity с десятками
 * полей, разбитых на semantic tabs. Каждый tab — independent form со своим
 * `onSubmit.intent` (или shared с parent). UX отличается от Wizard:
 * tabs — free-form navigation, per-tab save, вместо линейного Next/Back.
 *
 * Typical use: Keycloak Client settings (10 tabs × 30+ fields), Keycloak
 * Realm general config, AWS IAM role config, K8s Deployment YAML as tabs.
 *
 * Shape (в `slots.body` через `projection.bodyOverride`):
 *   {
 *     type: "tabbedForm",
 *     tabs: [
 *       { id: "settings", title: "Settings", fields: [...], onSubmit: { intent: "updateClient" } },
 *       { id: "roles",    title: "Roles",    fields: [...], onSubmit: { intent: "updateRoles" } },
 *     ],
 *     initialTab?: "settings",
 *     value?: { ... }  // initial form state (обычно из target entity)
 *   }
 *
 * Per-tab state: dirty-tracking, save button disabled при clean state.
 * Между tabs value persists — user может переключаться без потери.
 */
export default function TabbedForm({ node, target, ctx }) {
  const tabs = Array.isArray(node?.tabs) ? node.tabs : [];
  const [activeTabId, setActiveTabId] = useState(
    node?.initialTab || tabs[0]?.id || null,
  );
  const [values, setValues] = useState(() => {
    const initial = { ...(node?.value || {}) };
    // target-overlay: если есть target-entity, берём default из её полей
    if (target) {
      for (const tab of tabs) {
        for (const field of tab.fields || []) {
          if (initial[field.name] === undefined && target[field.name] !== undefined) {
            initial[field.name] = target[field.name];
          }
        }
      }
    }
    return initial;
  });
  const [dirtyFields, setDirtyFields] = useState(new Set());

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId],
  );

  if (tabs.length === 0) {
    return (
      <div style={{ padding: 20, color: "var(--idf-text-muted, #6b7280)" }}>
        TabbedForm: нет вкладок в spec.
      </div>
    );
  }

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setDirtyFields(prev => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
  };

  const activeFields = activeTab?.fields || [];
  const activeDirty = activeFields.some(f => dirtyFields.has(f.name));

  const handleSave = () => {
    if (!activeTab?.onSubmit?.intent || !ctx?.exec) return;
    const payload = {};
    for (const f of activeFields) {
      payload[f.name] = values[f.name];
    }
    if (target?.id) payload.id = target.id;
    ctx.exec(activeTab.onSubmit.intent, payload);
    // Clear dirty для текущего tab'а после save
    setDirtyFields(prev => {
      const next = new Set(prev);
      for (const f of activeFields) next.delete(f.name);
      return next;
    });
  };

  const AdaptedPaper = getAdaptedComponent("primitive", "paper");
  const Wrapper = AdaptedPaper || FallbackPaper;

  return (
    <Wrapper padding="lg">
      <TabBar
        tabs={tabs.map(t => ({ id: t.id, label: t.title || t.id }))}
        activeId={activeTab?.id}
        onChange={setActiveTabId}
      />
      <div style={{ padding: "16px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeFields.map(field => (
            <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>
                {field.label || field.name}
                {field.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
              </label>
              <ParameterControl
                spec={field}
                value={values[field.name]}
                onChange={(v) => handleChange(field.name, v)}
                ctx={ctx}
              />
            </div>
          ))}
          {activeFields.length === 0 && (
            <div style={{ color: "var(--idf-text-muted, #6b7280)", fontSize: 13, padding: 12 }}>
              Во вкладке «{activeTab?.title}» нет полей.
            </div>
          )}
        </div>

        {activeTab?.onSubmit?.intent && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={!activeDirty}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid var(--idf-border, #d1d5db)",
                background: activeDirty ? "var(--idf-accent, #1677ff)" : "var(--idf-surface-soft, #f3f4f6)",
                color: activeDirty ? "#fff" : "var(--idf-text-muted, #6b7280)",
                fontSize: 14,
                fontWeight: 600,
                cursor: activeDirty ? "pointer" : "not-allowed",
                opacity: activeDirty ? 1 : 0.7,
              }}
            >
              {activeTab.onSubmit.label || "Сохранить"}
            </button>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

function TabBar({ tabs, activeId, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 24,
        borderBottom: "1px solid var(--idf-border, #e5e7eb)",
        padding: "0 4px",
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 2px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${
                isActive ? "var(--idf-accent, #1677ff)" : "transparent"
              }`,
              color: isActive
                ? "var(--idf-text, #1a1a2e)"
                : "var(--idf-accent, #1677ff)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab.label || tab.id}
          </button>
        );
      })}
    </div>
  );
}

function FallbackPaper({ children }) {
  return (
    <div style={{
      background: "var(--idf-card, #ffffff)",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--idf-border, #e5e7eb)",
    }}>
      {children}
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--idf-text-muted, #6b7280)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
