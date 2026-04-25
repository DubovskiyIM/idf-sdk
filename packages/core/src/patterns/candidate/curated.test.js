/**
 * Curated candidate bank tests — schema + registry integration.
 * 8 structured кандидатов из profi+avito field research (2026-04-17-18).
 */
import { describe, it, expect } from "vitest";
import { validatePattern } from "../schema.js";
import {
  createRegistry,
  loadStablePatterns,
  loadCandidatePatterns,
  getDefaultRegistry,
  resetDefaultRegistry,
} from "../registry.js";
import { CURATED_CANDIDATES } from "./curated.js";

describe("curated candidate bank — schema validity", () => {
  for (const pattern of CURATED_CANDIDATES) {
    it(`"${pattern.id}" проходит validatePattern`, () => {
      expect(() => validatePattern(pattern)).not.toThrow();
    });

    it(`"${pattern.id}" имеет status:"candidate"`, () => {
      expect(pattern.status).toBe("candidate");
    });

    it(`"${pattern.id}" имеет rationale.evidence с хотя бы одним элементом`, () => {
      expect(Array.isArray(pattern.rationale?.evidence)).toBe(true);
      expect(pattern.rationale.evidence.length).toBeGreaterThan(0);
    });

    it(`"${pattern.id}" имеет falsification.shouldMatch + shouldNotMatch`, () => {
      expect(Array.isArray(pattern.falsification?.shouldMatch)).toBe(true);
      expect(pattern.falsification.shouldMatch.length).toBeGreaterThan(0);
      expect(Array.isArray(pattern.falsification?.shouldNotMatch)).toBe(true);
      expect(pattern.falsification.shouldNotMatch.length).toBeGreaterThan(0);
    });
  }

  it("в curated bank ровно 10 паттернов (6 базовых + 4 tri-source candidates 2026-04-25)", () => {
    expect(CURATED_CANDIDATES.length).toBe(10);
  });

  it("все id уникальны внутри curated bank", () => {
    const ids = CURATED_CANDIDATES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("curated candidate bank — registry integration", () => {
  it("loadCandidatePatterns регистрирует все 10 curated в пустом registry", () => {
    const registry = createRegistry();
    loadCandidatePatterns(registry);
    for (const pattern of CURATED_CANDIDATES) {
      expect(registry.getPattern(pattern.id)).toBe(pattern);
    }
  });

  it("нет коллизий id между stable и curated candidate", () => {
    const registry = createRegistry();
    loadStablePatterns(registry);
    loadCandidatePatterns(registry);
    // Sanity: stable (40 — +3 B2 promotions + catalog-action-cta §8.1 + catalog-default-datagrid
    // + 3 Gravitino WebUI v2 promotions 2026-04-23 + bidirectional-canvas-tree-selection
    // 2026-04-24 + dual-status-badge-card + resource-hierarchy-canvas ArgoCD 2026-04-25
    // + diff-preview-before-irreversible Sprint 1 P0 #5 2026-04-25) + curated (6).
    // Totals могут быть выше за счёт manifest-свалки (127+), но она
    // частично schema-lax и не вся попадает в registry.
    const stableCount = registry.getAllPatterns("stable").length;
    const candidateCount = registry.getAllPatterns("candidate").length;
    expect(stableCount).toBe(44);
    // Curated (10) прошли validatePattern; manifest-свалка может добавить >0.
    expect(candidateCount).toBeGreaterThanOrEqual(10);
    // Проверка, что каждый curated действительно в registry.
    for (const pattern of CURATED_CANDIDATES) {
      expect(registry.getPattern(pattern.id)).toBeTruthy();
    }
  });

  it("default registry НЕ загружает curated candidate автоматически", () => {
    resetDefaultRegistry();
    const registry = getDefaultRegistry();
    for (const pattern of CURATED_CANDIDATES) {
      expect(registry.getPattern(pattern.id)).toBeUndefined();
    }
    resetDefaultRegistry();
  });

  it("curated archetypes распределены по catalog/detail/cross/null", () => {
    const archetypes = new Set(CURATED_CANDIDATES.map(p => p.archetype));
    expect(archetypes.has("catalog")).toBe(true);
    expect(archetypes.has("detail")).toBe(true);
    // null — cross-archetype паттерны (human-in-the-loop-gate, agent-plan-preview-approve).
    expect(archetypes.has(null)).toBe(true);
  });
});
