/**
 * faceted-filter-panel (stable, catalog). Merge-промоция из 3 candidate'ов
 * (profi-ru / workzilla / kwork) — свалка содержала независимые извлечения
 * одного и того же паттерна. Объединены по принципу «один trigger,
 * slot настраивается через projection».
 *
 * Задача: catalog с множественными ортогональными filter-осями получает
 * declarative filter-panel с typed-controls по field-role, вместо
 * generic-search-box.
 *
 * Trigger: catalog + один из сигналов:
 *   A) у mainEntity ≥3 filter-способных полей (money/percentage/enum-options/boolean);
 *   B) в intents ≥2 filter_* intent'а, меняющих session.filters или Entity.filter*.
 *
 * Apply: `body.filterPanel = { slot, groups: [{ field, fieldRole, control, options? }] }`.
 * Default slot — "sidebar" (desktop); автор может выставить
 * projection.filterSlot ∈ "sidebar" | "toolbar" | "sheet" | "drawer".
 */

import { inferFieldRole } from "../../../crystallize_v2/ontologyHelpers.js";

const FILTERABLE_ROLES = new Set([
  "money", "percentage", "trend",
]);

/**
 * Определить control по field-role / типу для фильтр-контрола.
 *   - money/percentage → range-slider
 *   - enum (options) → checklist/multi-select
 *   - boolean → toggle
 *   - date/datetime → date-range
 *   - text с ticker role → autocomplete
 */
function inferFilterControl(name, fieldDef) {
  const role = inferFieldRole(name, fieldDef || {})?.role;
  if (role === "money" || role === "percentage" || role === "trend") {
    return { kind: "range", role };
  }
  if (Array.isArray(fieldDef?.options) && fieldDef.options.length > 0) {
    return { kind: "checklist", options: fieldDef.options.slice() };
  }
  if (fieldDef?.type === "boolean") {
    return { kind: "toggle" };
  }
  if (fieldDef?.type === "date" || fieldDef?.type === "datetime") {
    return { kind: "dateRange" };
  }
  return null;
}

function collectFilterableFields(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return [];
  const out = [];
  for (const [name, def] of Object.entries(fields)) {
    const control = inferFilterControl(name, def);
    if (control) {
      out.push({ field: name, control, fieldDef: def });
    }
  }
  return out;
}

function collectFilterIntents(intents) {
  const out = [];
  for (const intent of intents || []) {
    const id = intent?.id || "";
    const isFilterIntent = /^filter_|_filter$/i.test(id);
    if (!isFilterIntent) {
      const effects = intent?.particles?.effects || [];
      const touchesFilter = effects.some(e =>
        e?.α === "replace" &&
        typeof e?.target === "string" &&
        /(^|\.)filter|session\.filters/i.test(e.target)
      );
      if (!touchesFilter) continue;
    }
    out.push(intent);
  }
  return out;
}

export default {
  id: "faceted-filter-panel",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "catalog") return false;
      if (projection?.filterPanel === false) return false;
      const entity = ontology?.entities?.[projection?.mainEntity];
      const filterable = collectFilterableFields(entity);
      if (filterable.length >= 3) return true;
      const filterIntents = collectFilterIntents(intents);
      return filterIntents.length >= 2;
    },
  },
  structure: {
    slot: "body",
    description:
      "Faceted-panel с typed-controls по field-role (money→range, enum→" +
      "checklist, boolean→toggle, date→dateRange). Slot по умолчанию " +
      "\"sidebar\"; автор может переопределить через projection.filterSlot.",
    /**
     * Apply: заполняет body.filterPanel. Idempotent — если body.filterPanel
     * уже задан автором, не трогаем.
     */
    apply(slots, context) {
      const { projection, ontology } = context || {};
      const body = slots?.body || {};
      if (body.filterPanel) return slots;

      const entity = ontology?.entities?.[projection?.mainEntity];
      const groups = collectFilterableFields(entity).map(({ field, control, fieldDef }) => ({
        field,
        fieldRole: control.role || null,
        control: control.kind,
        options: control.options,
        label: fieldDef?.label || field,
      }));
      if (groups.length === 0) return slots;

      const slot = projection?.filterSlot || "sidebar";
      return {
        ...slots,
        body: {
          ...body,
          filterPanel: { slot, groups, liveApply: true },
        },
      };
    },
  },
  rationale: {
    hypothesis:
      "Catalog с ≥3 ортогональными фильтр-осями превращает generic-search " +
      "в conversation: tweak → see результат. Panel с typed-controls " +
      "делает дискретность каждой оси видимой.",
    evidence: [
      { source: "profi.ru",  description: "Sticky-right panel с 5-7 секциями",                  reliability: "high" },
      { source: "workzilla", description: "Left sidebar c category + budget + toggles",          reliability: "high" },
      { source: "kwork",     description: "Sidebar с typed controls по field-role",              reliability: "high" },
      { source: "airbnb",    description: "Modal-фасет с group price/rooms/amenities",           reliability: "high" },
      { source: "amazon",    description: "Left sidebar facets — de-facto e-commerce standard",  reliability: "high" },
      { source: "booking",   description: "Левая панель с range sliders + checkbox-группами",    reliability: "high" },
    ],
    counterexample: [
      { source: "gmail",  description: "Inbox — один generic-search, фасет-panel overkill",     reliability: "high" },
      { source: "mobile", description: "На mobile desktop-sidebar неуместен — bottom-sheet",    reliability: "high" },
    ],
    mergeSources: [
      "candidate/bank/2026-04-19-profi-ru-catalog-faceted-filter-panel.json",
      "candidate/bank/2026-04-19-workzilla-marketplace-faceted-filter-panel.json",
      "candidate/bank/2026-04-19-kwork-service-packages-faceted-filter-panel.json",
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales",    projection: "listings_feed",
        reason: "≥3 filterable fields (price/category/condition)" },
      { domain: "booking",  projection: "specialists_browse",
        reason: "price + rating + location + verification" },
      { domain: "freelance", projection: "tasks_board",
        reason: "budget + category + urgency + skills" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversations_list",
        reason: "≤2 фильтра (unread / pinned)" },
      { domain: "reflect",   projection: "mood_entries_feed",
        reason: "один temporal диапазон" },
    ],
  },
};
