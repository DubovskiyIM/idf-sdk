/**
 * mergeViewWithParent — merge projection (parent) с одним view entry.
 *
 * Inheritance rules (§2.2 design spec):
 *  - Scalar/array keys — view replaces parent
 *  - Object keys (patterns, strategy) — shallow merge (view keys поверх)
 *  - Отсутствие ключа в view → inherit from parent
 *
 * Q/W-level override (§2.4) блокируется с warning:
 *  - mainEntity, entities, filter, witnesses, idParam
 *
 * Archetype whitelist (§2.5, §12.11): catalog / feed / dashboard / canvas.
 *  - catalog/feed/dashboard — auto-derived через slot-assembly.
 *  - canvas — host-managed (требует registerCanvas(viewId, Component));
 *    slot-assembly заменяется placeholder body, host рисует кастомный
 *    компонент. Используется для Notion calendar/timeline/Gantt views.
 * Остальные — fallback на parent.kind + warning.
 */

const Q_LEVEL_KEYS = new Set(["mainEntity", "entities", "filter", "witnesses", "idParam"]);
const ALLOWED_VIEW_ARCHETYPES = new Set(["catalog", "feed", "dashboard", "canvas"]);
const OBJECT_MERGE_KEYS = new Set(["patterns", "strategy"]);

export function mergeViewWithParent(projection, view) {
  const warnings = [];
  const merged = { ...projection };

  for (const [key, value] of Object.entries(view)) {
    if (key === "id" || key === "name") continue;

    if (Q_LEVEL_KEYS.has(key)) {
      warnings.push(
        `view '${view.id}' attempts to override Q-level key '${key}'; ignored. Use separate projection for different query.`
      );
      continue;
    }

    if (OBJECT_MERGE_KEYS.has(key) && value && typeof value === "object" && !Array.isArray(value)) {
      merged[key] = { ...(projection[key] || {}), ...value };
      continue;
    }

    merged[key] = value;
  }

  if (merged.kind && !ALLOWED_VIEW_ARCHETYPES.has(merged.kind)) {
    warnings.push(
      `view '${view.id}' archetype '${merged.kind}' not in view whitelist (catalog|feed|dashboard|canvas); fallback to parent.kind '${projection.kind}'.`
    );
    merged.kind = projection.kind;
  }

  merged.viewId = view.id;
  merged.name = view.name || projection.name || view.id;

  return { merged, warnings };
}
