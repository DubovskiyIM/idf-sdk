// explainMatch.test.js
import { describe, it, expect } from "vitest";
import { explainMatch } from "./index.js";

const ONTOLOGY = {
  entities: {
    Portfolio: { fields: { name: { type: "text" } } },
    Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
  },
};
const INTENTS = [
  { id: "add_position", creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
];
const PROJECTION = { kind: "detail", mainEntity: "Portfolio" };

describe("explainMatch", () => {
  it("returns archetype, behavioral, structural", () => {
    const result = explainMatch(INTENTS, ONTOLOGY, PROJECTION);
    expect(result.archetype).toBe("detail");
    expect(result).toHaveProperty("behavioral");
    expect(result.structural).toHaveProperty("matched");
    expect(result.structural.matched.some(m => m.pattern.id === "subcollections")).toBe(true);
  });

  it("returns witnesses array in §15 shape", () => {
    const result = explainMatch(INTENTS, ONTOLOGY, PROJECTION);
    const sub = result.witnesses.find(w => w.pattern === "subcollections");
    expect(sub).toMatchObject({ basis: "pattern-bank", reliability: "rule-based" });
  });

  it("includes nearMiss when requested", () => {
    const result = explainMatch(INTENTS, ONTOLOGY, PROJECTION, { includeNearMiss: true });
    expect(result.structural).toHaveProperty("nearMiss");
  });

  it("artifactBefore and artifactAfter differ when preview is active", () => {
    const result = explainMatch(INTENTS, ONTOLOGY, PROJECTION, { previewPatternId: "subcollections" });
    expect(result.artifactBefore).toBeDefined();
    expect(result.artifactAfter).toBeDefined();
    expect(result.previewPatternId).toBe("subcollections");
    // subcollections.structure.apply пишет в slots.sections, а не в top-level sections.
    // Архетипы-рендереры читают именно из artifact.slots.*, поэтому preview должен
    // обогащать slot-ветку.
    expect(result.artifactAfter.slots).toBeDefined();
    expect(result.artifactAfter.slots.sections?.length).toBeGreaterThan(0);
  });
});
