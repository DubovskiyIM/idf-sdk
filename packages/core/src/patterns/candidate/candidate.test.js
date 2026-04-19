import { describe, it, expect } from "vitest";
import {
  CANDIDATE_PATTERNS,
  getCandidatePatterns,
  getCandidatesByArchetype,
  getCandidate,
  groupCandidatesByTheme,
  loadCandidatePatterns,
} from "./index.js";
import { createRegistry } from "../registry.js";

describe("candidate bank", () => {
  it("manifest загружается, >100 кандидатов", () => {
    expect(CANDIDATE_PATTERNS.length).toBeGreaterThanOrEqual(100);
  });

  it("все кандидаты имеют status:\"candidate\"", () => {
    for (const p of CANDIDATE_PATTERNS) {
      expect(p.status).toBe("candidate");
    }
  });

  it("все кандидаты имеют id + trigger.requires", () => {
    for (const p of CANDIDATE_PATTERNS) {
      expect(p.id).toBeTruthy();
      expect(Array.isArray(p.trigger?.requires)).toBe(true);
    }
  });

  it("дубликаты id агрегированы в pattern.sources[]", () => {
    const merged = CANDIDATE_PATTERNS.find(p => p.sources?.length > 1);
    expect(merged).toBeTruthy();
    expect(merged.sources.every(s => typeof s.file === "string")).toBe(true);
  });

  it("getCandidate по id возвращает запись", () => {
    const any = CANDIDATE_PATTERNS[0];
    expect(getCandidate(any.id)).toBeTruthy();
    expect(getCandidate("__does-not-exist__")).toBeNull();
  });

  it("getCandidatesByArchetype фильтрует", () => {
    const catalog = getCandidatesByArchetype("catalog");
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every(p => p.archetype === "catalog")).toBe(true);
  });

  it("getCandidatePatterns возвращает копию (mutation-safe)", () => {
    const a = getCandidatePatterns();
    a.push({ id: "evil" });
    const b = getCandidatePatterns();
    expect(b.find(p => p.id === "evil")).toBeUndefined();
  });

  it("groupCandidatesByTheme группирует по ключам", () => {
    const grouped = groupCandidatesByTheme();
    expect(grouped["faceted-filter"]?.length).toBeGreaterThan(0);
    expect(grouped.misc).toBeDefined();
  });

  it("loadCandidatePatterns регистрирует без падений на schema-mismatch", () => {
    const registry = createRegistry();
    loadCandidatePatterns(registry);
    // Минимум половина кандидатов должна пройти валидацию и попасть в registry
    const stored = registry.getAllPatterns("candidate");
    expect(stored.length).toBeGreaterThan(CANDIDATE_PATTERNS.length / 2);
  });

  it("candidate-паттерны не попадают в stable matchPatterns()", () => {
    const registry = createRegistry();
    loadCandidatePatterns(registry);
    // matchPatterns ищет только status:"stable" — candidate не должны оказаться
    const matches = registry.matchPatterns([], {}, { mainEntity: null, kind: "catalog" });
    expect(matches.every(p => p.status === "stable")).toBe(true);
  });
});
