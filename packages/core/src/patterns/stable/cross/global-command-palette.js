/**
 * global-command-palette — ⌘K overlay для быстрого доступа к любому intent.
 *
 * Signal: domain с большим количеством intents (≥15) неизбежно теряет
 * discoverability через меню и tabbed UI. Command palette даёт O(1)
 * доступ по fuzzy name-match.
 *
 * Конвергентный signal: independently extracted from Linear, Height,
 * Superhuman в pattern-bank research (2026-04-18).
 */
export default {
  id: "global-command-palette",
  version: 1,
  status: "stable",
  archetype: null, // cross-archetype — overlay-слой над любой projection
  trigger: {
    requires: [
      { kind: "intent-count", min: 15 },
    ],
  },
  structure: {
    slot: "overlay",
    description: "Modal fuzzy-searchable список всех intents + recent/frecency ranking. Invoked по ⌘K/Ctrl+K.",
  },
  rationale: {
    hypothesis:
      "Когда intent surface > ~15, button/menu layout становится overwhelming. " +
      "Command palette — плоский keyboard-first entry: O(1) по name-match вместо O(depth) по иерархии. " +
      "Не заменяет archetype-specific UI — работает поверх любой projection как универсальный keyboard layer.",
    evidence: [
      { source: "linear", description: "⌘K Command Menu — единый entry для всех действий", reliability: "high" },
      { source: "superhuman", description: "⌘K для search + navigation + command execution", reliability: "high" },
      { source: "height", description: "⌘K command palette, J/K navigation", reliability: "high" },
      { source: "notion", description: "⌘/ slash menu — parallel реализация того же подхода", reliability: "medium" },
    ],
    counterexample: [
      {
        source: "flat-domains",
        description: "Домен с 3-5 intents — палитра overkill, inline buttons эффективнее",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_feed", reason: "sales имеет 225 intents — явный overflow для menu-approach" },
      { domain: "messenger", projection: "conversation_list", reason: "messenger 100 intents" },
      { domain: "invest", projection: "portfolios_root", reason: "invest 58 intents — выше threshold 15" },
    ],
    shouldNotMatch: [
      // booking ~22 intents, но projection-локально не все применимы — намеренный soft limit
      { domain: "booking", projection: "review_form", reason: "review_form имеет узкий набор intents, локальных ≤3" },
    ],
  },
};
