import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

const INTENTS = {
  add_task: {
    name: "Создать",
    creates: "Task",
    particles: { effects: [{ α: "add", target: "tasks" }], confirmation: "enter" },
  },
};
const ONTOLOGY = {
  entities: {
    Task: { fields: { id: { type: "text" }, title: { type: "text" } } },
  },
};

describe("projection.hero (UI-gap #9 — authored)", () => {
  it("без projection.hero → hero остаётся пустым (legacy) или содержит heroCreate", () => {
    const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    // Authored отсутствует; может быть heroCreate если creator-intent матчится
    // confirmation:"enter" — matches heroCreate archetype.
    expect(Array.isArray(slots.hero)).toBe(true);
  });

  it("projection.hero — object → обёрнут в array + положен первым", () => {
    const heroNode = { type: "carousel", slides: [{ title: "Banner" }] };
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      hero: heroNode,
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.hero[0]).toEqual(heroNode);
  });

  it("projection.hero — array → prepend as-is", () => {
    const heroNodes = [
      { type: "carousel", slides: [{ title: "A" }] },
      { type: "card", children: [{ type: "text", content: "B" }] },
    ];
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      hero: heroNodes,
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.hero.slice(0, 2)).toEqual(heroNodes);
  });

  it("authored hero + heroCreate intent → authored wins, heroCreate не в hero-слоте", () => {
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      hero: { type: "carousel", slides: [{ title: "Преимущества" }] },
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    // hero содержит только authored carousel — heroCreate не аппендится
    // (slots.hero.length > 0 → re-wrap в intentButton).
    expect(slots.hero).toHaveLength(1);
    expect(slots.hero[0].type).toBe("carousel");
    // heroCreate-variant без params skipped (creator + no params guard).
    // Для creator-intent с params должен бы уйти в toolbar (проверяется
    // в отдельном тесте ниже).
  });

  it("authored hero + creator с params → creator уходит в toolbar", () => {
    const intents = {
      add_task_form: {
        name: "Создать задачу",
        creates: "Task",
        parameters: [{ name: "title", type: "text", required: true }],
        particles: {
          entities: ["task: Task"],
          confirmation: "form",
          effects: [{ α: "add", target: "tasks" }],
        },
      },
    };
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      hero: { type: "carousel", slides: [{ title: "Banner" }] },
    };
    const slots = assignToSlotsCatalog(intents, projection, ONTOLOGY);
    expect(slots.hero[0].type).toBe("carousel");
    const toolbarIntents = slots.toolbar.map(b => b.intentId).filter(Boolean);
    expect(toolbarIntents).toContain("add_task_form");
  });

  it("authored hero: null → legacy hero:[] behavior", () => {
    const projection = {
      kind: "catalog", mainEntity: "Task", entities: ["Task"],
      hero: null,
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(Array.isArray(slots.hero)).toBe(true);
    expect(slots.hero.every(h => h.intentId === "add_task" || h.type === "heroCreate")).toBe(true);
  });
});
