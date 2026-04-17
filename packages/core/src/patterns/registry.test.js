import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry } from "./registry.js";

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
