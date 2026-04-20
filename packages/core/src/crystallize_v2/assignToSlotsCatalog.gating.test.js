import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

const INTENTS = {
  start_test: {
    name: "Пройти тест",
    particles: { effects: [{ α: "replace", target: "user.testPassed", value: true }] },
  },
};
const ONTOLOGY = {
  entities: {
    Task: { fields: { id: { type: "text" }, title: { type: "text" } } },
  },
};

describe("projection.gating (UI-gap #6)", () => {
  it("без projection.gating → slots.gating === null", () => {
    const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.gating).toBeNull();
  });

  it("projection.gating.steps → slots.gating as gatingPanel node", () => {
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      gating: {
        title: "Необходимые шаги",
        steps: [
          { id: "reg", label: "Регистрация", icon: "👤", done: "viewer.registered === true" },
          { id: "test", label: "Тест", icon: "📝",
            done: "viewer.testPassed === true",
            cta: { label: "Пройти", intentId: "start_test" } },
        ],
      },
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.gating.type).toBe("gatingPanel");
    expect(slots.gating.title).toBe("Необходимые шаги");
    expect(slots.gating.steps).toHaveLength(2);
    expect(slots.gating.steps[1].cta.intentId).toBe("start_test");
  });

  it("gating без steps → slots.gating === null (graceful)", () => {
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      gating: { title: "No steps" },
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.gating).toBeNull();
  });
});
