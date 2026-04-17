import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry, loadStablePatterns } from "./registry.js";

const mockPattern = {
  id: "test-hero-create", version: 1, status: "stable", archetype: "catalog",
  trigger: { requires: [{ kind: "intent-creates", entity: "$mainEntity" }, { kind: "intent-confirmation", confirmation: "enter" }] },
  structure: { slot: "hero", description: "Inline creator" },
  rationale: { hypothesis: "test", evidence: [{ source: "t", description: "t", reliability: "high" }] },
  falsification: {
    shouldMatch: [{ domain: "t", projection: "list", reason: "has creator" }],
    shouldNotMatch: [{ domain: "t", projection: "detail", reason: "not catalog" }],
  },
};

const mockDetailPattern = {
  id: "test-phase-cta", version: 1, status: "stable", archetype: "detail",
  trigger: { requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 3 }] },
  structure: { slot: "primaryCTA", description: "Phase buttons" },
  rationale: { hypothesis: "test", evidence: [{ source: "t", description: "t", reliability: "high" }] },
  falsification: {
    shouldMatch: [{ domain: "t", projection: "detail", reason: "has status" }],
    shouldNotMatch: [{ domain: "t", projection: "chat", reason: "no status" }],
  },
};

describe("registry", () => {
  let registry;
  beforeEach(() => { registry = createRegistry(); });

  it("registerPattern adds pattern", () => {
    registry.registerPattern(mockPattern);
    expect(registry.getPattern("test-hero-create")).toBe(mockPattern);
  });

  it("registerPattern validates", () => {
    expect(() => registry.registerPattern({ id: "bad" })).toThrow();
  });

  it("rejects duplicate id", () => {
    registry.registerPattern(mockPattern);
    expect(() => registry.registerPattern(mockPattern)).toThrow("duplicate");
  });

  it("getAllPatterns filters by status", () => {
    registry.registerPattern(mockPattern);
    registry.registerPattern({ ...mockDetailPattern, id: "cand", status: "candidate" });
    expect(registry.getAllPatterns("stable")).toHaveLength(1);
    expect(registry.getAllPatterns("candidate")).toHaveLength(1);
  });

  it("matchPatterns returns matching patterns by archetype", () => {
    registry.registerPattern(mockPattern);
    registry.registerPattern(mockDetailPattern);

    const ontology = {
      entities: { Poll: { fields: { status: { type: "select", options: ["draft", "open", "closed", "resolved", "cancelled"] } } } },
    };
    const intents = [{ id: "create_poll", creates: "Poll", particles: { confirmation: "enter", effects: [] } }];

    const catalogMatched = registry.matchPatterns(intents, ontology, { kind: "catalog", mainEntity: "Poll" });
    expect(catalogMatched.some(p => p.id === "test-hero-create")).toBe(true);
    expect(catalogMatched.some(p => p.id === "test-phase-cta")).toBe(false);

    const detailMatched = registry.matchPatterns(intents, ontology, { kind: "detail", mainEntity: "Poll" });
    expect(detailMatched.some(p => p.id === "test-phase-cta")).toBe(true);
    expect(detailMatched.some(p => p.id === "test-hero-create")).toBe(false);
  });

  it("matchPatterns respects cross-archetype (null)", () => {
    const crossPattern = { ...mockPattern, id: "cross", archetype: null };
    registry.registerPattern(crossPattern);
    const ontology = { entities: { Poll: { fields: {} } } };
    const intents = [{ id: "create_poll", creates: "Poll", particles: { confirmation: "enter", effects: [] } }];
    const matched = registry.matchPatterns(intents, ontology, { kind: "detail", mainEntity: "Poll" });
    expect(matched.some(p => p.id === "cross")).toBe(true);
  });

  it("measureCoverage counts covered projections", () => {
    registry.registerPattern(mockDetailPattern);
    const domains = [{
      id: "test",
      ontology: { entities: { Poll: { fields: { status: { type: "select", options: ["a", "b", "c"] } } } } },
      intents: { open: { particles: { entities: ["p: Poll"], effects: [] } } },
      projections: {
        poll_detail: { kind: "detail", mainEntity: "Poll" },
        poll_list: { kind: "catalog", mainEntity: "Poll" },
      },
    }];
    const result = registry.measureCoverage(domains);
    expect(result.total).toBe(2);
    expect(result.covered).toBe(1); // only detail matches
    expect(result.rate).toBe(0.5);
  });
});

describe("matchPatterns with includeNearMiss", () => {
  let registry;
  beforeEach(() => {
    registry = createRegistry();
    loadStablePatterns(registry);
  });

  const ontology = {
    entities: {
      Poll: {
        fields: { status: { type: "select", options: ["open", "closed"] } },  // 2 options, not 3
      },
    },
  };
  const intents = [
    { id: "close_poll", particles: { effects: [{ α: "replace", target: "poll.status", value: "closed" }] } },
  ];
  const projection = { mainEntity: "Poll", kind: "detail" };

  it("returns matched array when no includeNearMiss", () => {
    const result = registry.matchPatterns(intents, ontology, projection);
    expect(Array.isArray(result)).toBe(true);   // legacy array shape
  });

  it("returns { matched, nearMiss } when includeNearMiss=true", () => {
    const result = registry.matchPatterns(intents, ontology, projection, { includeNearMiss: true });
    expect(result).toHaveProperty("matched");
    expect(result).toHaveProperty("nearMiss");
    expect(Array.isArray(result.matched)).toBe(true);
    expect(Array.isArray(result.nearMiss)).toBe(true);
  });

  it("detects near-miss when exactly one requirement fails", () => {
    // phase-aware-primary-cta: requires minOptions 3 (fails), and intent-effect (passes)
    const result = registry.matchPatterns(intents, ontology, projection, { includeNearMiss: true });
    const nearIds = result.nearMiss.map(m => m.pattern.id);
    expect(nearIds).toContain("phase-aware-primary-cta");
    const entry = result.nearMiss.find(m => m.pattern.id === "phase-aware-primary-cta");
    expect(entry.missing).toBe(1);
    expect(entry.explain.requirements.some(r => !r.ok)).toBe(true);
  });

  it("does not include full-match patterns in nearMiss", () => {
    const ontology2 = {
      entities: {
        Poll: { fields: { status: { type: "select", options: ["a", "b", "c"] } } },
      },
    };
    const result = registry.matchPatterns(intents, ontology2, projection, { includeNearMiss: true });
    const matchedIds = result.matched.map(m => m.pattern.id);
    const nearIds = result.nearMiss.map(m => m.pattern.id);
    for (const id of matchedIds) expect(nearIds).not.toContain(id);
  });
});
