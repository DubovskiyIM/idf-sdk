/**
 * dual-status-badge-card — карточка catalog'а с двумя orthogonal status-badge'ами.
 *
 * Status-driven admin (GitOps, K8s, CI/CD, observability) выводит две независимые
 * оси состояния на одну карточку: ArgoCD Application — Sync (Synced/OutOfSync) +
 * Health (Healthy/Progressing/Degraded); Spinnaker Cluster — Build (success/fail) +
 * Deploy (running/done); RTO/RPO snapshots — Lag + Coverage. Один badge сворачивает
 * orthogonal axes в derived value, теряя forensic information.
 *
 * Promote'ится из argocd-pattern-batch (2026-04-24): argocd-web-ui кандидат с
 * dedicated category "status-driven admin". Эталоны: ArgoCD Applications grid,
 * Flux Sources list, Spinnaker Clusters tab, Rancher cluster catalog.
 *
 * Trigger: catalog + mainEntity содержит ≥2 enum-полей с признаками "status"
 * (fieldRole === "status" ИЛИ name ends with "Status"/"State"/"Phase"). Оба
 * должны быть в witnesses проекции (т.е. автор посчитал их relevant для catalog).
 *
 * Структура: расширяет cardSpec через `badges: [...]` массив (не conflict'ит
 * с legacy `badge` single-slot — renderer fallback'ит). Order: первый witness
 * выигрывает primary slot.
 *
 * Apply order: ПОСЛЕ grid-card-layout (грид + cardSpec уже построены) — иначе
 * нечего расширять. Если grid-card-layout не сработал (не grid), pattern
 * no-op (badges имеют смысл только в card-визуале, не в list-row).
 */

const STATUS_NAME_HINTS = [/Status$/i, /State$/i, /Phase$/i];

function looksLikeStatusField(fieldName, fieldDef) {
  if (!fieldDef) return false;
  // Must be enum-like (string with values OR boolean — но boolean редко "status").
  const hasValues = (() => { const v = fieldDef.values ?? fieldDef.options; return Array.isArray(v) && v.length >= 2; })();
  if (!hasValues) return false;
  if (fieldDef.fieldRole === "status") return true;
  if (typeof fieldName === "string" && STATUS_NAME_HINTS.some(re => re.test(fieldName))) return true;
  return false;
}

/**
 * Извлекает status-witnesses из witnesses-list проекции. Сохраняет порядок
 * объявления (witness order = author intent).
 */
function pickStatusWitnesses(witnesses, entity) {
  if (!Array.isArray(witnesses) || !entity?.fields) return [];
  const out = [];
  for (const w of witnesses) {
    const name = typeof w === "string" ? (w.includes(".") ? w.split(".")[0] : w) : null;
    if (!name) continue;
    const fieldDef = entity.fields[name];
    if (looksLikeStatusField(name, fieldDef)) {
      out.push({ bind: name, label: fieldDef.label || name, values: fieldDef.values ?? fieldDef.options });
    }
  }
  return out;
}

export default {
  id: "dual-status-badge-card",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    /**
     * Matches: catalog + mainEntity + ≥2 status-like enum-полей в witnesses.
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "catalog") return false;
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity?.fields) return false;
      const statusWitnesses = pickStatusWitnesses(projection?.witnesses, entity);
      return statusWitnesses.length >= 2;
    },
  },
  structure: {
    slot: "body",
    description: "Расширяет cardSpec через `badges: [{bind, label, values}, ...]` (≥2 status-axes на карточке). Применяется только когда body.layout === 'grid' (grid-card-layout сработал ранее) — badges имеют смысл в card-визуале. cardSpec.badge (legacy single-slot) backfill'ится первым элементом для backward-compat. Author-override: если cardSpec.badges уже задан — no-op.",
    /**
     * Apply:
     *  - skip если body.layout !== "grid" (badges релевантны только cards)
     *  - skip если cardSpec уже содержит badges (author-override / earlier pattern)
     *  - выводит ≥2 status-witnesses → cardSpec.badges = [...]
     *  - backfill cardSpec.badge ← badges[0] для legacy renderer
     */
    apply(slots, context) {
      const { projection, ontology } = context;
      const body = slots?.body;
      if (!body) return slots;
      if (body.layout !== "grid") return slots;
      const existingSpec = body.cardSpec;
      if (!existingSpec || existingSpec.variants) {
        // polymorphic cardSpec — отдельный case, не покрываем в v1
        return slots;
      }
      if (Array.isArray(existingSpec.badges) && existingSpec.badges.length > 0) return slots;

      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity?.fields) return slots;
      const statusWitnesses = pickStatusWitnesses(projection?.witnesses, entity);
      if (statusWitnesses.length < 2) return slots;

      const newCardSpec = { ...existingSpec, badges: statusWitnesses };
      // Backfill legacy single-badge slot первым из badges (если ещё не задан).
      if (!newCardSpec.badge) {
        newCardSpec.badge = { bind: statusWitnesses[0].bind };
      }
      return { ...slots, body: { ...body, cardSpec: newCardSpec } };
    },
  },
  rationale: {
    hypothesis: "Status-driven admin (GitOps, K8s, CI/CD) выводит ≥2 orthogonal status-axes на одну карточку, потому что один derived badge скрывает причину. Sync vs Health в ArgoCD — независимы: cluster может быть Synced (Git==live) но Degraded (pods crashlooping); или Healthy + OutOfSync (live > desired, drift). Сворачивание в один axis уничтожает диагностическую информацию.",
    evidence: [
      { source: "ArgoCD Web UI", description: "Application card имеет sync (Synced/OutOfSync/Unknown) + health (Healthy/Progressing/Degraded/Suspended/Missing) badges рядом", reliability: "high" },
      { source: "Flux / Weave GitOps", description: "Source row показывает Ready + Suspended (parallel axes)", reliability: "high" },
      { source: "Spinnaker Deck", description: "Cluster row: Server Group state + last execution status", reliability: "high" },
      { source: "Rancher Manager", description: "Cluster card: state (Active/Provisioning/Updating/Error) + provider state", reliability: "high" },
    ],
    counterexample: [
      { source: "sales/listing", description: "Listing.status — один axis (active/sold/expired); второго orthogonal status нет → single badge корректен", reliability: "high" },
      { source: "messenger/conversation", description: "Conversation не имеет status-полей вообще", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "applications_list", reason: "Application: syncStatus + healthStatus enum-fields в witnesses" },
      { domain: "argocd", projection: "applicationsets_list", reason: "ApplicationSet: status + generatorStatus" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_feed", reason: "Listing: один status field (active/sold) — single badge" },
      { domain: "messenger", projection: "conversations_feed", reason: "Conversation без enum-status полей" },
      { domain: "invest", projection: "portfolios_root", reason: "Portfolio: 3+ metrics → grid-card без status badges" },
    ],
  },
  // Helpers exported для тестов
  _helpers: { looksLikeStatusField, pickStatusWitnesses },
};
