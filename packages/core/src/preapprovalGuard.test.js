import { describe, it, expect } from "vitest";
import { checkPreapproval } from "./preapprovalGuard.js";

const baseOntology = {
  entities: { AgentPreapproval: { ownerField: "userId" } },
  roles: {
    agent: {
      preapproval: {
        entity: "AgentPreapproval",
        ownerField: "userId",
        requiredFor: ["agent_execute_preapproved_order"],
        checks: [
          { kind: "active", field: "active" },
          { kind: "maxAmount", paramField: "total", limitField: "maxOrderAmount" },
        ],
      },
    },
  },
};

const viewer = { id: "user_1" };
const pa = { id: "pa_1", userId: "user_1", active: true, maxOrderAmount: 100_000 };
const params = { total: 10_000 };

describe("checkPreapproval — collection name lookup", () => {
  it("находит preapproval в camelCase world (agentPreapprovals)", () => {
    const world = { agentPreapprovals: [pa] };
    const r = checkPreapproval("agent_execute_preapproved_order", params, viewer,
      baseOntology, world);
    expect(r.ok).toBe(true);
    expect(r.preapprovalId).toBe("pa_1");
  });

  it("находит preapproval в legacy lowercase world (agentpreapprovals)", () => {
    const world = { agentpreapprovals: [pa] };
    const r = checkPreapproval("agent_execute_preapproved_order", params, viewer,
      baseOntology, world);
    expect(r.ok).toBe(true);
    expect(r.preapprovalId).toBe("pa_1");
  });

  it("нет коллекции в обеих формах → no_preapproval", () => {
    const world = {};
    const r = checkPreapproval("agent_execute_preapproved_order", params, viewer,
      baseOntology, world);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_preapproval");
  });

  it("camelCase и lowercase одновременно — camelCase приоритетнее", () => {
    const world = {
      agentPreapprovals: [{ ...pa, id: "pa_new" }],
      agentpreapprovals: [{ ...pa, id: "pa_old" }],
    };
    const r = checkPreapproval("agent_execute_preapproved_order", params, viewer,
      baseOntology, world);
    expect(r.preapprovalId).toBe("pa_new");
  });

  it("notExpired принимает ISO-string для expiresAt", () => {
    const ontology = {
      entities: { AgentPreapproval: { ownerField: "userId" } },
      roles: { agent: { preapproval: {
        entity: "AgentPreapproval", ownerField: "userId",
        requiredFor: ["agent_execute_preapproved_order"],
        checks: [{ kind: "notExpired", field: "expiresAt" }],
      }}},
    };
    const futureISO = new Date(Date.now() + 86400000).toISOString();
    const world = { agentPreapprovals: [{ id: "pa_1", userId: "user_1", expiresAt: futureISO }] };
    const r = checkPreapproval("agent_execute_preapproved_order", {}, viewer, ontology, world);
    expect(r.ok).toBe(true);
  });

  it("notExpired возвращает invalid_expiresAt для мусора", () => {
    const ontology = {
      entities: { AgentPreapproval: { ownerField: "userId" } },
      roles: { agent: { preapproval: {
        entity: "AgentPreapproval", ownerField: "userId",
        requiredFor: ["agent_execute_preapproved_order"],
        checks: [{ kind: "notExpired", field: "expiresAt" }],
      }}},
    };
    const world = { agentPreapprovals: [{ id: "pa_1", userId: "user_1", expiresAt: "не дата" }] };
    const r = checkPreapproval("agent_execute_preapproved_order", {}, viewer, ontology, world);
    expect(r.ok).toBe(false);
    expect(r.details.reason).toBe("invalid_expiresAt");
  });
});
