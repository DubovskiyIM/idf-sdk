/**
 * Candidate bank («свалка»).
 *
 * 127 паттернов, извлечённых Claude Researcher Pipeline (см.
 * scripts/pattern-researcher.mjs в idf/) из реальных продуктов. Не stable —
 * не применяются автоматически через matchPatterns(). Используются для:
 *   - matching-only диагностики (какие кандидаты подходят под projection?),
 *   - ручного отбора в stable (merge-сессии по темам),
 *   - falsification-валидации через shouldMatch/shouldNotMatch.
 *
 * Дубликаты id (несколько extraction'ов одного паттерна из разных
 * источников) агрегированы в pattern.sources[].
 *
 * Регенерация manifest.js после добавления новых кандидатов в bank/:
 *   node packages/core/scripts/generate-candidates-manifest.mjs
 */
import { CANDIDATE_PATTERNS as MANIFEST_CANDIDATES } from "./manifest.js";
import { CURATED_CANDIDATES } from "./curated.js";

/**
 * Общий массив кандидатов — union манифеста (свалка, 127+) и курированных
 * (структурированные JS-модули в catalog/detail/feed, проходят строгий
 * validatePattern).
 *
 * Порядок: сначала курированные (строгая схема, включая falsification),
 * потом manifest-свалка. Дубликаты id разрешаются в loadCandidatePatterns
 * (first wins) — курированный побеждает manifest-версию, если id совпал.
 */
const CANDIDATE_PATTERNS = [...CURATED_CANDIDATES, ...MANIFEST_CANDIDATES];

/**
 * Получить все candidate-паттерны (как array). Не валидируются жёстко —
 * bank может содержать шероховатые kind'ы, это нормально до промоции.
 */
export function getCandidatePatterns() {
  return CANDIDATE_PATTERNS.slice();
}

/**
 * Получить кандидатов по archetype (catalog/detail/feed/cross/null).
 */
export function getCandidatesByArchetype(archetype) {
  if (!archetype) return [];
  return CANDIDATE_PATTERNS.filter(p => p.archetype === archetype);
}

/**
 * Кандидат по id (первое совпадение; id могут коллидировать, sources[]
 * хранит все extraction'ы).
 */
export function getCandidate(id) {
  return CANDIDATE_PATTERNS.find(p => p.id === id) || null;
}

/**
 * Группировка по теме — простая эвристика для merge-сессий.
 * Темы вычисляются по keyword'ам в id/description (promotion/tier/timer/etc).
 */
const THEME_KEYWORDS = {
  "faceted-filter":       ["faceted", "filter-panel", "filter-chip"],
  "hierarchy-nav":        ["hierarchy", "tree-nav"],
  "monetization":         ["promoted", "paid-visibility", "paid-modifier", "sponsored", "emphasis"],
  "trust-tier":           ["tier-badge", "trust-signal", "reputation", "derived-tier"],
  "wizard-composition":   ["wizard", "autosave-draft", "draft-resume", "polymorphic-form", "preview-before"],
  "role-scoped":          ["role-scoped", "escalation-observer", "capability-gated"],
  "live-compute":         ["live-total", "derived-total", "paid-modifier-composer", "computed-cta"],
  "irreversibility":      ["undo-toast", "countdown-auto", "single-select-siblings", "bounded-revision"],
  "subcollection-shape":  ["sidebar-subcollection", "secondary-filters", "inline-sub-creator"],
  "stat-header":          ["feed-summary-header", "stat-breakdown", "dashboard-kpi"],
  "status-signal":        ["status-tab-feed", "temporal-witness-chip", "derived-presence"],
  "keyboard-flow":        ["hotkey", "keyboard-property", "keyboard-hotkey", "inline-editable-hero", "tab-cycle"],
  "bulk-action":          ["bulk-action", "bulk-selection", "profile-level-bulk"],
  "command-palette":      ["command-palette", "global-command", "universal-command"],
};

export function groupCandidatesByTheme(patterns = CANDIDATE_PATTERNS) {
  const out = {};
  const misc = [];
  for (const p of patterns) {
    const haystack = (p.id + " " + (p.structure?.description || "")).toLowerCase();
    let matched = false;
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      if (keywords.some(k => haystack.includes(k))) {
        if (!out[theme]) out[theme] = [];
        out[theme].push(p);
        matched = true;
        break;
      }
    }
    if (!matched) misc.push(p);
  }
  if (misc.length) out.misc = misc;
  return out;
}

/**
 * Регистрирует всех кандидатов в пользовательский registry (ручная
 * загрузка — не делается автоматически из createRegistry, чтобы не
 * засорять production-поиск stable-паттернов).
 *
 * Дубликаты id разрешаются: если id уже существует, регистрация
 * пропускается (первый wins). В production используйте getCandidate(id).
 */
export function loadCandidatePatterns(registry) {
  for (const pattern of CANDIDATE_PATTERNS) {
    try {
      if (!registry.getPattern(pattern.id)) {
        registry.registerPattern(pattern);
      }
    } catch {
      // Schema-mismatch — кандидаты не обязаны проходить строгую
      // валидацию (это «свалка»). Тихо пропускаем, доступ через
      // getCandidate() остаётся.
    }
  }
  return registry;
}

export { CANDIDATE_PATTERNS };
export { CURATED_CANDIDATES } from "./curated.js";
