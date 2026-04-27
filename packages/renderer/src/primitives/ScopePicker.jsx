/**
 * ScopePicker — primitive для `global-scope-picker` pattern apply (§13b/§13e).
 *
 * Pattern apply кладёт `{ type: "scopePicker", entity, label, source }` в
 * `slots.header` array. Без зарегистрированного primitive SlotRenderer
 * печатает «Unknown type: scopePicker». Этот компонент — minimal default:
 * label + (если есть rows в `world[entity_lowercased+"s"]`) — text-name
 * текущего scope из routeParams или viewState.
 *
 * Renderer-agnostic (не тащит antd/mantine). Адаптеры могут переопределить
 * через `getAdaptedComponent("primitive", "scopePicker")` (когда
 * понадобится drop-down с переключением).
 */

import { getAdaptedComponent } from "../adapters/registry.js";

export default function ScopePicker({ node, ctx }) {
  const Adapted = getAdaptedComponent("primitive", "scopePicker");
  if (Adapted) return <Adapted node={node} ctx={ctx} />;

  const entity = node?.entity || "";
  const label = node?.label || entity || "Scope";

  // Попробуем найти "current" scope row через ctx.routeParams (e.g. realmId,
  // workspaceId) или ctx.viewState[`active${Entity}Id`].
  const idKeyA = entity ? entity[0].toLowerCase() + entity.slice(1) + "Id" : null;
  const idKeyB = entity ? `active${entity}Id` : null;
  const activeId = (idKeyA && ctx?.routeParams?.[idKeyA])
    || (idKeyB && ctx?.viewState?.[idKeyB])
    || null;

  let scopeName = null;
  if (entity && activeId && ctx?.world) {
    const collKey = entity[0].toLowerCase() + entity.slice(1) + "s";
    const coll = ctx.world[collKey];
    if (Array.isArray(coll)) {
      const row = coll.find(r => r?.id === activeId);
      scopeName = row?.name || row?.title || row?.label || activeId;
    }
  }

  return (
    <div
      role="status"
      aria-label={`${label}: ${scopeName || "не выбран"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 6,
        background: "var(--idf-surface-muted, rgba(99, 102, 241, 0.06))",
        border: "1px solid var(--idf-border, rgba(99, 102, 241, 0.20))",
        fontSize: 12,
        color: "var(--idf-text, #111827)",
        fontFamily: "var(--idf-font, system-ui)",
      }}
    >
      <span style={{ color: "var(--idf-text-muted, #6b7280)" }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>
        {scopeName || <em style={{ color: "var(--idf-text-muted, #9ca3af)" }}>—</em>}
      </span>
    </div>
  );
}
