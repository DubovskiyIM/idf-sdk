import { describe, it, expect } from "vitest";
import { filterWorldForRole } from "./filterWorld.js";

const baseOntology = {
  entities: {
    AgentPreapproval: { ownerField: "userId" },
    RiskProfile:      { ownerField: "userId" },
    Portfolio:        { ownerField: "userId" },
  },
  roles: {
    agent: {
      visibleFields: {
        AgentPreapproval: ["id", "userId", "active"],
        RiskProfile:      ["id", "userId", "level"],
        Portfolio:        ["id", "userId", "name"],
      },
    },
  },
};

const viewer = { id: "user_1" };

describe("filterWorldForRole — pluralize / camelCase collection names", () => {
  it("находит коллекцию в camelCase (agentPreapprovals)", () => {
    const raw = {
      agentPreapprovals: [{ id: "pa_1", userId: "user_1", active: true }],
      portfolios:        [{ id: "pf_1", userId: "user_1", name: "Main" }],
    };
    const out = filterWorldForRole(raw, baseOntology, "agent", viewer);
    expect(out.agentPreapprovals).toEqual([{ id: "pa_1", userId: "user_1", active: true }]);
    expect(out.portfolios).toHaveLength(1);
  });

  it("находит коллекцию в legacy lowercase — output нормализован в camelCase", () => {
    const raw = {
      agentpreapprovals: [{ id: "pa_1", userId: "user_1", active: true }],
      portfolios:        [{ id: "pf_1", userId: "user_1", name: "Main" }],
    };
    const out = filterWorldForRole(raw, baseOntology, "agent", viewer);
    expect(out.agentPreapprovals).toEqual([{ id: "pa_1", userId: "user_1", active: true }]);
    expect(out.agentpreapprovals).toBeUndefined();
  });

  it("RiskProfile → riskProfiles (camelCase сохраняется)", () => {
    const raw = {
      riskProfiles: [{ id: "rp_1", userId: "user_1", level: "balanced" }],
      portfolios:   [],
    };
    const out = filterWorldForRole(raw, baseOntology, "agent", viewer);
    expect(out.riskProfiles).toEqual([{ id: "rp_1", userId: "user_1", level: "balanced" }]);
  });

  it("нет matching коллекции → camelPlural key с []", () => {
    const raw = { portfolios: [] };
    const out = filterWorldForRole(raw, baseOntology, "agent", viewer);
    expect(out.agentPreapprovals).toEqual([]);
    expect(out.riskProfiles).toEqual([]);
  });

  it("booking legacy: TimeSlot → slots (last-segment plural) → output timeSlots", () => {
    const ontology = {
      entities: { TimeSlot: { ownerField: "userId" } },
      roles: { agent: { visibleFields: { TimeSlot: ["id", "userId"] } } },
    };
    const raw = { slots: [{ id: "s_1", userId: "user_1" }] };
    const out = filterWorldForRole(raw, ontology, "agent", viewer);
    expect(out.timeSlots).toHaveLength(1);
    expect(out.slots).toBeUndefined();
  });

  it("camelCase приоритетнее lowercase если обе формы есть в world", () => {
    const raw = {
      agentPreapprovals: [{ id: "pa_new", userId: "user_1", active: true }],
      agentpreapprovals: [{ id: "pa_old", userId: "user_1", active: false }],
      portfolios: [],
    };
    const out = filterWorldForRole(raw, baseOntology, "agent", viewer);
    expect(out.agentPreapprovals).toEqual([{ id: "pa_new", userId: "user_1", active: true }]);
    expect(out.agentpreapprovals).toBeUndefined();
  });
});
