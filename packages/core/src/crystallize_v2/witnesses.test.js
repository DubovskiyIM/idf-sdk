import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

describe("artifact.witnesses — pattern-bank findings", () => {
  it("writes pattern-bank witnesses with rule-based reliability", () => {
    const INTENTS = {
      add_position: { creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Portfolio: { fields: { name: { type: "text" } } },
        Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
      },
    };
    const PROJECTIONS = {
      portfolio_detail: { kind: "detail", mainEntity: "Portfolio" },
    };
    const { portfolio_detail } = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY);
    const patternWitnesses = portfolio_detail.witnesses.filter(w => w.basis === "pattern-bank");
    expect(patternWitnesses.length).toBeGreaterThan(0);
    const sub = patternWitnesses.find(w => w.pattern === "subcollections");
    expect(sub).toBeDefined();
    expect(sub.reliability).toBe("rule-based");
    expect(sub.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "sub-entity-exists", ok: true }),
    ]));
  });
});
