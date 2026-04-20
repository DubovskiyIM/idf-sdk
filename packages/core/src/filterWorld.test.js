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

describe("filterWorldForRole — multi-owner (§3.2)", () => {
  const ontology = {
    entities: {
      Deal: {
        owners: ["customerId", "executorId"],
        fields: { id: {}, customerId: {}, executorId: {}, status: {} },
      },
    },
    roles: {
      user: {
        visibleFields: {
          Deal: ["id", "customerId", "executorId", "status"],
        },
      },
    },
  };

  const world = {
    deals: [
      { id: "d1", customerId: "alice", executorId: "bob",  status: "open" },
      { id: "d2", customerId: "carol", executorId: "dave", status: "open" },
      { id: "d3", customerId: "alice", executorId: "dave", status: "open" },
    ],
  };

  it("customer видит свои Deal'ы (как customerId)", () => {
    const out = filterWorldForRole(world, ontology, "user", { id: "alice" });
    const ids = out.deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1", "d3"]);
  });

  it("executor видит свои Deal'ы (как executorId)", () => {
    const out = filterWorldForRole(world, ontology, "user", { id: "dave" });
    const ids = out.deals.map(d => d.id).sort();
    expect(ids).toEqual(["d2", "d3"]);
  });

  it("viewer видит Deal когда совпадает ХОТЬ ОДНО owner-поле", () => {
    const out = filterWorldForRole(world, ontology, "user", { id: "bob" });
    const ids = out.deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1"]);
  });

  it("viewer не видит Deal где не является ни одним из owners", () => {
    const out = filterWorldForRole(world, ontology, "user", { id: "eve" });
    expect(out.deals).toEqual([]);
  });

  it("legacy ownerField продолжает работать (backward-compat)", () => {
    const legacyOntology = {
      entities: {
        Deal: { ownerField: "customerId", fields: { id: {}, customerId: {} } },
      },
      roles: { user: { visibleFields: { Deal: ["id", "customerId"] } } },
    };
    const out = filterWorldForRole(world, legacyOntology, "user", { id: "alice" });
    const ids = out.deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1", "d3"]);
  });
});
