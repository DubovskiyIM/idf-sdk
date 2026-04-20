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

  it("в curated bank ровно 6 паттернов (review-criterion-breakdown + response-cost-before-action promoted в stable)", () => {
    expect(CURATED_CANDIDATES.length).toBe(6);
  });

  it("все id уникальны внутри curated bank", () => {
    const ids = CURATED_CANDIDATES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("curated candidate bank — registry integration", () => {
  it("loadCandidatePatterns регистрирует все 7 curated в пустом registry", () => {
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
    // Sanity: stable (30 — +review-criterion-breakdown +response-cost-before-action) + curated (6).
    // Totals могут быть выше за счёт manifest-свалки (127+), но она
    // частично schema-lax и не вся попадает в registry.
    const stableCount = registry.getAllPatterns("stable").length;
    const candidateCount = registry.getAllPatterns("candidate").length;
    expect(stableCount).toBe(30);
    // Curated (6) прошли validatePattern; manifest-свалка может добавить >0.
    expect(candidateCount).toBeGreaterThanOrEqual(6);
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

  it("curated archetypes распределены по catalog/detail (feed-паттерны promoted в stable)", () => {
    const archetypes = new Set(CURATED_CANDIDATES.map(p => p.archetype));
    expect(archetypes.has("catalog")).toBe(true);
    expect(archetypes.has("detail")).toBe(true);
    // feed-паттерны (response-cost-before-action) promoted в stable 2026-04-20.
  });
});
