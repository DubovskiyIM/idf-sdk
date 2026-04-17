import { describe, it, expect } from "vitest";
import { validatePattern, evaluateTrigger, evaluateTriggerExplained } from "./schema.js";

describe("validatePattern", () => {
  const validPattern = {
    id: "test-pattern", version: 1, status: "stable", archetype: "detail",
    trigger: { requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 3 }] },
    structure: { slot: "primaryCTA", description: "Test" },
    rationale: { hypothesis: "Test", evidence: [{ source: "test", description: "Test", reliability: "high" }] },
    falsification: {
      shouldMatch: [{ domain: "planning", projection: "poll_overview", reason: "has status" }],
      shouldNotMatch: [{ domain: "messenger", projection: "chat_view", reason: "no status" }],
    },
  };

  it("accepts valid pattern", () => {
    expect(() => validatePattern(validPattern)).not.toThrow();
  });

  it("rejects missing id", () => {
    expect(() => validatePattern({ ...validPattern, id: undefined })).toThrow("id");
  });

  it("rejects missing trigger.requires", () => {
    expect(() => validatePattern({ ...validPattern, trigger: {} })).toThrow("trigger.requires");
  });

  it("rejects empty falsification.shouldMatch", () => {
    expect(() => validatePattern({
      ...validPattern,
      falsification: { shouldMatch: [], shouldNotMatch: [{ domain: "x", projection: "y", reason: "z" }] },
    })).toThrow("shouldMatch");
  });

  it("rejects missing rationale", () => {
    expect(() => validatePattern({ ...validPattern, rationale: undefined })).toThrow("rationale");
  });

  it("rejects unknown trigger kind", () => {
    expect(() => validatePattern({
      ...validPattern,
      trigger: { requires: [{ kind: "unknown-kind" }] },
    })).toThrow("kind");
  });
});

describe("evaluateTrigger", () => {
  const ontology = {
    entities: {
      Poll: {
        fields: { status: { type: "select", options: ["draft", "open", "closed", "resolved", "cancelled"] }, title: { type: "text" } },
        statuses: ["draft", "open", "closed", "resolved", "cancelled"],
        ownerField: "organizerId",
      },
      TimeOption: { fields: { id: { type: "text" }, pollId: { type: "text" }, date: { type: "datetime" } } },
      Message: { fields: { content: { type: "textarea" }, senderId: { type: "text" } } },
    },
    roles: {
      agent: { base: "agent", preapproval: { entity: "AgentPreapproval" } },
      advisor: { scope: { User: { via: "assignments" } } },
    },
  };

  it("entity-field: matches when field exists with correct type", () => {
    const trigger = { requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 3 }] };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" })).toBe(true);
  });

  it("entity-field: fails when field missing", () => {
    const trigger = { requires: [{ kind: "entity-field", field: "status", type: "select" }] };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Message" })).toBe(false);
  });

  it("entity-field: fails when minOptions not met", () => {
    const trigger = { requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 10 }] };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" })).toBe(false);
  });

  it("intent-effect: matches when intent has matching effect", () => {
    const trigger = { requires: [{ kind: "intent-effect", α: "replace", targetSuffix: ".status" }] };
    const intents = [{ id: "open_poll", particles: { effects: [{ α: "replace", target: "poll.status" }] } }];
    expect(evaluateTrigger(trigger, intents, ontology, { mainEntity: "Poll" })).toBe(true);
  });

  it("intent-effect: fails with wrong α", () => {
    const trigger = { requires: [{ kind: "intent-effect", α: "remove", targetSuffix: ".status" }] };
    const intents = [{ id: "x", particles: { effects: [{ α: "replace", target: "poll.status" }] } }];
    expect(evaluateTrigger(trigger, intents, ontology, { mainEntity: "Poll" })).toBe(false);
  });

  it("intent-creates: matches $mainEntity", () => {
    const trigger = { requires: [{ kind: "intent-creates", entity: "$mainEntity" }] };
    const intents = [{ id: "create_poll", creates: "Poll", particles: { effects: [] } }];
    expect(evaluateTrigger(trigger, intents, ontology, { mainEntity: "Poll" })).toBe(true);
  });

  it("intent-creates: matches with discriminator", () => {
    const trigger = { requires: [{ kind: "intent-creates", entity: "Poll" }] };
    const intents = [{ id: "create_poll", creates: "Poll(draft)", particles: { effects: [] } }];
    expect(evaluateTrigger(trigger, intents, ontology, { mainEntity: "Poll" })).toBe(true);
  });

  it("sub-entity-exists: matches when FK entity exists", () => {
    const trigger = { requires: [{ kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" }] };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" })).toBe(true);
  });

  it("sub-entity-exists: fails when no sub-entity", () => {
    const trigger = { requires: [{ kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" }] };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Message" })).toBe(false);
  });

  it("has-role: matches", () => {
    const trigger = { requires: [{ kind: "has-role", roleBase: "agent" }] };
    expect(evaluateTrigger(trigger, [], ontology, {})).toBe(true);
  });

  it("field-role-present: matches fieldRole", () => {
    const moneyOntology = { entities: { P: { fields: { totalValue: { type: "number", fieldRole: "money" } } } } };
    const trigger = { requires: [{ kind: "field-role-present", fieldRole: "money" }] };
    expect(evaluateTrigger(trigger, [], moneyOntology, { mainEntity: "P" })).toBe(true);
  });

  it("intent-confirmation: matches", () => {
    const trigger = { requires: [{ kind: "intent-confirmation", confirmation: "enter" }] };
    const intents = [{ id: "send", particles: { confirmation: "enter", effects: [] } }];
    expect(evaluateTrigger(trigger, intents, ontology, {})).toBe(true);
  });

  it("all requires must be true (AND)", () => {
    const trigger = {
      requires: [
        { kind: "entity-field", field: "status", type: "select", minOptions: 3 },
        { kind: "entity-field", field: "nonexistent", type: "text" },
      ],
    };
    expect(evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" })).toBe(false);
  });

  it("calls match() after requires pass", () => {
    let called = false;
    const trigger = {
      requires: [{ kind: "entity-field", field: "status", type: "select" }],
      match: () => { called = true; return true; },
    };
    evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" });
    expect(called).toBe(true);
  });

  it("does NOT call match() when requires fail", () => {
    let called = false;
    const trigger = {
      requires: [{ kind: "entity-field", field: "nonexistent", type: "text" }],
      match: () => { called = true; return true; },
    };
    evaluateTrigger(trigger, [], ontology, { mainEntity: "Poll" });
    expect(called).toBe(false);
  });
});

describe("evaluateTriggerExplained", () => {
  const ontology = {
    entities: {
      Poll: { fields: { status: { type: "select", options: ["open", "closed", "draft"] } } },
    },
  };
  const intents = [
    { id: "close_poll", particles: { effects: [{ α: "replace", target: "poll.status", value: "closed" }] } },
  ];
  const projection = { mainEntity: "Poll", kind: "detail" };

  it("returns per-requirement results when all pass", () => {
    const trigger = {
      requires: [
        { kind: "entity-field", field: "status", type: "select", minOptions: 3 },
        { kind: "intent-effect", α: "replace", targetSuffix: ".status" },
      ],
    };
    const result = evaluateTriggerExplained(trigger, intents, ontology, projection);
    expect(result.ok).toBe(true);
    expect(result.requirements).toHaveLength(2);
    expect(result.requirements.every(r => r.ok)).toBe(true);
    expect(result.requirements[0].kind).toBe("entity-field");
    expect(result.requirements[0].spec).toMatchObject({ field: "status" });
  });

  it("returns per-requirement failures", () => {
    const trigger = {
      requires: [
        { kind: "entity-field", field: "status", type: "select", minOptions: 3 },
        { kind: "intent-effect", α: "create", targetSuffix: ".status" },  // fails
      ],
    };
    const result = evaluateTriggerExplained(trigger, intents, ontology, projection);
    expect(result.ok).toBe(false);
    expect(result.requirements[0].ok).toBe(true);
    expect(result.requirements[1].ok).toBe(false);
  });

  it("evaluates match() function when requires pass", () => {
    const trigger = {
      requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 3 }],
      match: () => false,
    };
    const result = evaluateTriggerExplained(trigger, intents, ontology, projection);
    expect(result.ok).toBe(false);
    expect(result.requirements[0].ok).toBe(true);
    expect(result.matchFn).toBe(true);
    expect(result.matchOk).toBe(false);
  });

  it("evaluateTrigger legacy wrapper matches explained.ok", () => {
    const trigger = {
      requires: [{ kind: "entity-field", field: "status", type: "select", minOptions: 3 }],
    };
    expect(evaluateTrigger(trigger, intents, ontology, projection))
      .toBe(evaluateTriggerExplained(trigger, intents, ontology, projection).ok);
  });
});
