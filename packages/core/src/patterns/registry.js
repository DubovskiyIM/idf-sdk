/**
 * Pattern Registry — загрузка, индексация, matching паттернов.
 * Factory function createRegistry() для изоляции (тесты, multiple instances).
 */

import { validatePattern, evaluateTrigger } from "./schema.js";

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

  function matchPatterns(intents, ontology, projection) {
    const matched = [];
    for (const pattern of getAllPatterns("stable")) {
      if (pattern.archetype && pattern.archetype !== (projection?.kind || "catalog")) continue;
      if (evaluateTrigger(pattern.trigger, intents, ontology, projection)) {
        matched.push(pattern);
      }
    }
    return matched;
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

const STABLE_PATTERNS = [
  heroCreate, phaseAwarePrimaryCta, subcollections, irreversibleConfirm,
  gridCardLayout, inlineSearch, composerEntry, voteGroup,
  antagonistToggle, footerInlineSetter,
  hierarchyTreeNav, discriminatorWizard, m2mAttachDialog,
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
