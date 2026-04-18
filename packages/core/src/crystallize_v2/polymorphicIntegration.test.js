import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

describe("crystallize_v2 polymorphic entities (v0.15)", () => {
  const ontology = {
    entities: {
      Task: {
        discriminator: "kind",
        variants: {
          story: { label: "Story", fields: { storyPoints: { type: "number" } } },
          bug:   { label: "Bug",   fields: { severity: { type: "enum", values: ["low", "high"] } } },
        },
        fields: {
          id: {},
          title: { type: "text" },
          kind: { type: "enum", values: ["story", "bug"] },
        },
      },
    },
  };

  const intents = {
    create_bug: {
      creates: "Task(bug)",
      name: "Баг",
      particles: { entities: ["Task"], effects: [{ α: "add", target: "tasks" }], witnesses: ["severity"] },
    },
    create_story: {
      creates: "Task(story)",
      name: "Стори",
      particles: { entities: ["Task"], effects: [{ α: "add", target: "tasks" }], witnesses: ["storyPoints"] },
    },
  };

  it("projection grid над polymorphic entity → artifact.slots.body.cardSpec.variants", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title", "severity", "storyPoints"],
        layout: "grid",
      },
    };
    const a = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    expect(a.slots.body.cardSpec?.variants).toBeDefined();
    expect(a.slots.body.cardSpec.discriminator).toBe("kind");
    expect(a.slots.body.cardSpec.variants.story).toBeDefined();
    expect(a.slots.body.cardSpec.variants.bug).toBeDefined();
  });

  it("polymorphic projection → witness basis=polymorphic-variant", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title"],
        layout: "grid",
      },
    };
    const a = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    const w = a.witnesses.find(x => x.basis === "polymorphic-variant");
    expect(w).toBeDefined();
    expect(w.reliability).toBe("rule-based");
    expect(w.pattern).toBe("polymorphic:variant-resolution");
    expect(w.requirements[0].spec.entity).toBe("Task");
    expect(w.requirements[0].spec.variants).toEqual(["story", "bug"]);
  });

  it("non-polymorphic projection — witness отсутствует", () => {
    const monoOnto = { entities: { Item: { fields: { id: {}, title: { type: "text" } } } } };
    const projections = { items_list: { kind: "catalog", mainEntity: "Item", witnesses: ["title"] } };
    const a = crystallizeV2({}, projections, monoOnto, "test").items_list;
    const w = (a.witnesses || []).find(x => x.basis === "polymorphic-variant");
    expect(w).toBeUndefined();
  });
});
