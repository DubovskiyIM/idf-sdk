import { describe, it, expect } from "vitest";
import pattern from "./catalog-creator-toolbar.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("catalog-creator-toolbar (§6.1)", () => {
  it("проходит schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches creator с confirmation:\"form\"", () => {
    const intents = [{
      id: "create_task",
      creates: "Task",
      confirmation: "form",
      parameters: [{ name: "title" }, { name: "price" }],
      particles: { confirmation: "form", effects: [] },
    }];
    const projection = { kind: "catalog", mainEntity: "Task" };
    const ontology = { entities: { Task: { fields: { title: { type: "text" }, price: { type: "number" } } } } };
    const res = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("matches creator с particles.parameters.length > 1", () => {
    const intents = [{
      id: "create_listing",
      creates: "Listing",
      particles: {
        parameters: [{ name: "title" }, { name: "description" }, { name: "price" }],
        effects: [],
      },
    }];
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const ontology = { entities: { Listing: { fields: { title: {} } } } };
    const res = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches single-text creator (heroCreate остаётся)", () => {
    const intents = [{
      id: "create_task_hero",
      creates: "Task",
      confirmation: "enter",
      parameters: [{ name: "title" }],
      particles: { confirmation: "enter", effects: [] },
    }];
    const projection = { kind: "catalog", mainEntity: "Task" };
    const ontology = { entities: { Task: { fields: { title: {} } } } };
    const res = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("apply добавляет intentButton в toolbar, если overlay уже есть", () => {
    const intents = [{
      id: "create_listing",
      name: "Создать листинг",
      creates: "Listing",
      confirmation: "form",
      particles: { confirmation: "form", effects: [], parameters: [{ name: "a" }, { name: "b" }] },
    }];
    const slots = {
      toolbar: [],
      overlay: [{ intentId: "create_listing", type: "formModal" }],
    };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      intents,
    });
    expect(next.toolbar).toHaveLength(1);
    expect(next.toolbar[0]).toMatchObject({
      type: "intentButton",
      intentId: "create_listing",
      opens: "overlay",
      overlayKey: "create_listing",
    });
  });

  it("apply idempotent: toolbar уже содержит intentId → no-op", () => {
    const intents = [{
      id: "create_listing",
      creates: "Listing",
      confirmation: "form",
      particles: { confirmation: "form", effects: [], parameters: [{ name: "a" }, { name: "b" }] },
    }];
    const slots = {
      toolbar: [{ type: "intentButton", intentId: "create_listing" }],
      overlay: [{ intentId: "create_listing", type: "formModal" }],
    };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      intents,
    });
    expect(next).toBe(slots);
  });
});
