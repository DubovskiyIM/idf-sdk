import { describe, it, expect } from "vitest";
import {
  normalizeIntentNative,
  normalizeIntentsMap,
} from "./normalizeIntentNative.js";

describe("normalizeIntentNative — native→legacy bridge", () => {
  it("native insert → α=add + target=plural + entities=[alias: Entity]", () => {
    const intent = {
      target: "Task",
      alpha: "insert",
      creates: "Task",
      parameters: { title: { type: "string", required: true } },
      particles: {
        confirmation: "enter",
        effects: [{ target: "Task", op: "insert" }],
      },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.entities).toEqual(["task: Task"]);
    expect(n.particles.effects).toEqual([{ target: "tasks", op: "insert", α: "add" }]);
    expect(n.parameters).toEqual([{ name: "title", type: "string", required: true }]);
  });

  it("native replace → α=replace + target=lowercase entity", () => {
    const intent = {
      target: "Task",
      alpha: "replace",
      parameters: { id: { type: "string", required: true } },
      particles: {
        effects: [{ target: "Task", op: "replace" }],
      },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.effects[0]).toEqual({ target: "task", op: "replace", α: "replace" });
  });

  it("native remove → α=remove", () => {
    const intent = {
      target: "Response",
      alpha: "remove",
      parameters: { id: { type: "string", required: true } },
      particles: { effects: [{ target: "Response", op: "remove" }] },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.effects[0].α).toBe("remove");
    expect(n.particles.effects[0].target).toBe("response");
  });

  it("legacy intent с particles.entities не трогается (no-op)", () => {
    const intent = {
      particles: {
        entities: ["task: Task"],
        witnesses: ["task.title"],
        effects: [{ α: "replace", target: "task.status" }],
      },
      parameters: [{ name: "id", type: "text", required: true }],
    };
    const n = normalizeIntentNative(intent);
    expect(n).toBe(intent); // референтная равенство → действительно no-op
  });

  it("effect с уже заполненным α — не трогается", () => {
    const intent = {
      target: "Task",
      particles: { effects: [{ α: "replace", target: "task.status" }] },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.effects[0]).toEqual({ α: "replace", target: "task.status" });
  });

  it("existing particles.entities имеет приоритет", () => {
    const intent = {
      target: "Response",
      particles: {
        entities: ["task: Task", "response: Response"],
      },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.entities).toEqual(["task: Task", "response: Response"]);
  });

  it("parameters array — не трогается", () => {
    const intent = {
      target: "Task",
      parameters: [{ name: "x", type: "text" }],
    };
    const n = normalizeIntentNative(intent);
    expect(n.parameters).toEqual([{ name: "x", type: "text" }]);
  });

  it("parameters object — в array", () => {
    const intent = {
      parameters: { price: { type: "number", required: true }, note: { type: "text" } },
    };
    const n = normalizeIntentNative(intent);
    expect(n.parameters).toEqual([
      { name: "price", type: "number", required: true },
      { name: "note", type: "text" },
    ]);
  });

  it("Entity на Y заканчивается → plural ies", () => {
    const intent = {
      target: "Category",
      particles: { effects: [{ target: "Category", op: "insert" }] },
    };
    const n = normalizeIntentNative(intent);
    expect(n.particles.effects[0].target).toBe("categories");
  });

  it("null/undefined intent — pass-through", () => {
    expect(normalizeIntentNative(null)).toBe(null);
    expect(normalizeIntentNative(undefined)).toBe(undefined);
  });

  it("intent без native-полей и legacy-entities — только parameters mutate", () => {
    const intent = { parameters: { x: { type: "text" } } };
    const n = normalizeIntentNative(intent);
    expect(n.parameters).toEqual([{ name: "x", type: "text" }]);
  });
});

describe("normalizeIntentsMap", () => {
  it("идемпотентно — second call возвращает тот же объект", () => {
    const INTENTS = {
      createTask: {
        target: "Task",
        alpha: "insert",
        creates: "Task",
        parameters: { title: { type: "string" } },
        particles: { effects: [{ target: "Task", op: "insert" }] },
      },
    };
    const first = normalizeIntentsMap(INTENTS);
    const second = normalizeIntentsMap(first);
    expect(second).toBe(first);
  });

  it("all-legacy INTENTS — no-op, возвращает тот же объект", () => {
    const INTENTS = {
      editTask: {
        particles: {
          entities: ["task: Task"],
          effects: [{ α: "replace", target: "task.title" }],
        },
        parameters: [{ name: "title", type: "text" }],
      },
    };
    const out = normalizeIntentsMap(INTENTS);
    expect(out).toBe(INTENTS);
  });
});
