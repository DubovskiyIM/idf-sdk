import { describe, it, expect } from "vitest";
import pattern from "./catalog-action-cta.js";

function intent(id, effects, particles = {}) {
  return { id, particles: { effects, ...particles } };
}

describe("catalog-action-cta trigger.match", () => {
  it("матчит каталог с replace-intent на mainEntity", () => {
    const intents = [
      intent("editTask", [{ α: "replace", target: "task.title" }]),
      intent("publishTask", [{ α: "replace", target: "task" }]), // native-normalized
    ];
    const projection = { mainEntity: "Task", kind: "catalog" };
    expect(pattern.trigger.match(intents, {}, projection)).toBe(true);
  });

  it("не матчит, если нет replace на mainEntity", () => {
    const intents = [
      intent("search", [], { confirmation: "form", witnesses: ["query", "results"] }),
    ];
    const projection = { mainEntity: "Task", kind: "catalog" };
    expect(pattern.trigger.match(intents, {}, projection)).toBe(false);
  });

  it("не матчит без mainEntity", () => {
    expect(pattern.trigger.match([], {}, {})).toBe(false);
  });
});

describe("catalog-action-cta apply", () => {
  it("тагирует item.intents source='derived:catalog-action-cta'", () => {
    const slots = {
      body: {
        type: "list",
        item: {
          type: "card",
          intents: [
            { intentId: "editTask", label: "Редактировать" },
            { intentId: "publishTask", label: "Опубликовать" },
          ],
        },
      },
    };
    const out = pattern.structure.apply(slots, {});
    expect(out.body.item.intents[0].source).toBe("derived:catalog-action-cta");
    expect(out.body.item.intents[1].source).toBe("derived:catalog-action-cta");
  });

  it("idempotent — второй apply возвращает тот же slots", () => {
    const slots = {
      body: {
        item: {
          intents: [{ intentId: "editTask", source: "derived:catalog-action-cta" }],
        },
      },
    };
    const out = pattern.structure.apply(slots, {});
    expect(out).toBe(slots);
  });

  it("no-op при отсутствии item.intents", () => {
    const slots = { body: { item: { intents: [] } } };
    expect(pattern.structure.apply(slots, {})).toBe(slots);
  });

  it("no-op при отсутствии body.item", () => {
    const slots = { body: { type: "list" } };
    expect(pattern.structure.apply(slots, {})).toBe(slots);
  });
});
