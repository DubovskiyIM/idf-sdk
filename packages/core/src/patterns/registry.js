/**
 * Pattern Registry — загрузка, индексация, matching паттернов.
 * Factory function createRegistry() для изоляции (тесты, multiple instances).
 */

import { validatePattern, evaluateTriggerExplained } from "./schema.js";

export function createRegistry() {
  const patterns = new Map();

  function registerPattern(pattern) {
    validatePattern(pattern);
    if (patterns.has(pattern.id)) {
      throw new Error(`Pattern duplicate id: "${pattern.id}"`);
    }
    patterns.set(pattern.id, pattern);
  }

  function getPattern(id) {
    return patterns.get(id);
  }

  function getAllPatterns(status = "stable") {
    return [...patterns.values()].filter(p => p.status === status);
  }

  function matchPatterns(intents, ontology, projection, options = {}) {
    const matched = [];
    const nearMiss = [];
    const includeNearMiss = options.includeNearMiss === true;
    for (const pattern of getAllPatterns("stable")) {
      if (pattern.archetype && pattern.archetype !== (projection?.kind || "catalog")) continue;
      const explain = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
      if (explain.ok) {
        matched.push({ pattern, explain });
        continue;
      }
      if (!includeNearMiss) continue;
      // total = число «слотов» условий: все requires + match() если задан.
      // passed = сколько из них прошли. missing === 1 ⇒ near-miss (ровно одно условие не сработало).
      const total = explain.requirements.length + (explain.matchFn ? 1 : 0);
      const passedReqs = explain.requirements.filter(r => r.ok).length;
      const matchPassed = explain.matchFn && explain.matchOk === true ? 1 : 0;
      const passed = passedReqs + matchPassed;
      const missing = total - passed;
      if (missing === 1) {
        nearMiss.push({
          pattern,
          explain,
          missing: explain.requirements.some(r => !r.ok) ? 1 : "match-fn",
        });
      }
    }
    if (includeNearMiss) return { matched, nearMiss };
    return matched.map(m => m.pattern);   // legacy array shape
  }

  function measureCoverage(domains) {
    let total = 0;
    let covered = 0;
    const details = [];
    for (const domain of domains) {
      for (const [projId, proj] of Object.entries(domain.projections)) {
        total++;
        const projIntents = Object.entries(domain.intents)
          .filter(([, intent]) => {
            const entities = (intent.particles?.entities || []).map(e => e.split(":").pop().trim().replace(/\[\]$/, ""));
            return !proj.mainEntity || entities.includes(proj.mainEntity);
          })
          .map(([id, intent]) => ({ id, ...intent }));
        const matched = matchPatterns(projIntents, domain.ontology, proj);
        if (matched.length > 0) covered++;
        details.push({ domain: domain.id, projection: projId, matchedPatterns: matched.map(p => p.id) });
      }
    }
    return { total, covered, rate: total > 0 ? covered / total : 0, details };
  }

  return { registerPattern, getPattern, getAllPatterns, matchPatterns, measureCoverage };
}

// Auto-load stable patterns
import heroCreate from "./stable/catalog/hero-create.js";
import phaseAwarePrimaryCta from "./stable/detail/phase-aware-primary-cta.js";
import subcollections from "./stable/detail/subcollections.js";
import irreversibleConfirm from "./stable/cross/irreversible-confirm.js";
import gridCardLayout from "./stable/catalog/grid-card-layout.js";
import inlineSearch from "./stable/cross/inline-search.js";
import composerEntry from "./stable/feed/composer-entry.js";
import voteGroup from "./stable/detail/vote-group.js";
import antagonistToggle from "./stable/feed/antagonist-toggle.js";
import footerInlineSetter from "./stable/detail/footer-inline-setter.js";
import hierarchyTreeNav from "./stable/cross/hierarchy-tree-nav.js";
import discriminatorWizard from "./stable/catalog/discriminator-wizard.js";
import m2mAttachDialog from "./stable/detail/m2m-attach-dialog.js";
// v0.10: golden-standard batch (Linear / Stripe / Notion / Height / Superhuman)
import globalCommandPalette from "./stable/cross/global-command-palette.js";
import optimisticReplaceWithUndo from "./stable/cross/optimistic-replace-with-undo.js";
import bulkActionToolbar from "./stable/cross/bulk-action-toolbar.js";
import kanbanPhaseColumnBoard from "./stable/catalog/kanban-phase-column-board.js";
import keyboardPropertyPopover from "./stable/detail/keyboard-property-popover.js";
import observerReadonlyEscape from "./stable/detail/observer-readonly-escape.js";
import lifecycleLockedParameters from "./stable/detail/lifecycle-locked-parameters.js";
// Backlog §6.1 / §6.5 / §6.6
import catalogCreatorToolbar   from "./stable/catalog/catalog-creator-toolbar.js";
import catalogExcludeSelfOwned from "./stable/catalog/catalog-exclude-self-owned.js";
import timerCountdownVisible   from "./stable/detail/timer-countdown-visible.js";
// Merge-промоции из candidate bank
import facetedFilterPanel       from "./stable/catalog/faceted-filter-panel.js";
import reputationTierBadge      from "./stable/cross/reputation-tier-badge.js";
import paidVisibilityElevation  from "./stable/catalog/paid-visibility-elevation.js";
import computedCtaLabel         from "./stable/detail/computed-cta-label.js";
import undoToastWindow          from "./stable/cross/undo-toast-window.js";
// B2 curated promotion (2026-04-20)
import reviewCriterionBreakdown from "./stable/detail/review-criterion-breakdown.js";
import responseCostBeforeAction from "./stable/feed/response-cost-before-action.js";
import ratingAggregateHero      from "./stable/detail/rating-aggregate-hero.js";
// Workzilla dogfood (backlog §8.1)
import catalogActionCta         from "./stable/catalog/catalog-action-cta.js";
// Gravitino dogfood (2026-04-23 promotion from candidate)
import catalogDefaultDatagrid   from "./stable/catalog/catalog-default-datagrid.js";
import lifecycleGatedDestructive from "./stable/detail/lifecycle-gated-destructive.js";
import inlineChipAssociation     from "./stable/catalog/inline-chip-association.js";
import reverseAssociationBrowser from "./stable/detail/reverse-association-browser.js";
// Selfai dogfood (2026-04-24 promotion from candidate — co-selection gates closed)
import bidirectionalCanvasTreeSelection from "./stable/cross/bidirectional-canvas-tree-selection.js";
// ArgoCD dogfood (2026-04-25 promotion from argocd-pattern-batch)
import dualStatusBadgeCard from "./stable/catalog/dual-status-badge-card.js";
import resourceHierarchyCanvas from "./stable/detail/resource-hierarchy-canvas.js";
import specVsStatusPanels from "./stable/detail/spec-vs-status-panels.js";
import formYamlDualSurface from "./stable/detail/form-yaml-dual-surface.js";
// Sprint 1 P0 #5 (2026-04-25)
import diffPreviewBeforeIrreversible from "./stable/cross/diff-preview-before-irreversible.js";

const STABLE_PATTERNS = [
  heroCreate, phaseAwarePrimaryCta, subcollections, irreversibleConfirm,
  gridCardLayout, inlineSearch, composerEntry, voteGroup,
  antagonistToggle, footerInlineSetter,
  hierarchyTreeNav, discriminatorWizard, m2mAttachDialog,
  // Golden-standard batch (v0.10)
  globalCommandPalette, optimisticReplaceWithUndo, bulkActionToolbar,
  kanbanPhaseColumnBoard, keyboardPropertyPopover, observerReadonlyEscape,
  lifecycleLockedParameters,
  // Backlog §6.1 / §6.5 / §6.6
  catalogCreatorToolbar,
  catalogExcludeSelfOwned,
  timerCountdownVisible,
  // Merge-промоции (candidate → stable)
  facetedFilterPanel,
  reputationTierBadge,
  paidVisibilityElevation,
  computedCtaLabel,
  undoToastWindow,
  // B2 curated promotion (2026-04-20)
  reviewCriterionBreakdown,
  responseCostBeforeAction,
  ratingAggregateHero,
  // Workzilla dogfood (backlog §8.1)
  catalogActionCta,
  // Gravitino dogfood (2026-04-23)
  catalogDefaultDatagrid,
  lifecycleGatedDestructive,
  inlineChipAssociation,
  reverseAssociationBrowser,
  // Selfai dogfood (2026-04-24)
  bidirectionalCanvasTreeSelection,
  // ArgoCD dogfood (2026-04-25)
  dualStatusBadgeCard,
  resourceHierarchyCanvas,
  specVsStatusPanels,
  formYamlDualSurface,
  // Sprint 1 P0 #5 (2026-04-25)
  diffPreviewBeforeIrreversible,
];

export function loadStablePatterns(registry) {
  for (const pattern of STABLE_PATTERNS) {
    if (!registry.getPattern(pattern.id)) {
      registry.registerPattern(pattern);
    }
  }
  return registry;
}

let _defaultRegistry = null;

export function getDefaultRegistry() {
  if (!_defaultRegistry) _defaultRegistry = createRegistry();
  return _defaultRegistry;
}

export function resetDefaultRegistry() {
  _defaultRegistry = null;
}

// Re-export для удобного импорта loadCandidatePatterns из registry.js
// (default registry candidate НЕ грузит автоматически — opt-in).
export { loadCandidatePatterns } from "./candidate/index.js";
