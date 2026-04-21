/**
 * Integration-тест: native-format ontology (Workzilla-like scaffold)
 * должна производить populated toolbar / item.intents после crystallize.
 *
 * Контракт backlog §8.1 / Workzilla findings P0-1: `intent.target +
 * permittedFor` + replace-effect → кнопка либо в toolbar (projection-level),
 * либо в item.intents (per-item).
 */
import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

const workzillaOntology = {
  entities: {
    Task: {
      kind: "internal",
      ownerField: "customerId",
      fields: {
        id: { type: "string", readOnly: true },
        customerId: { type: "string", required: true, readOnly: true },
        title: { type: "string", required: true },
        budget: { type: "number", fieldRole: "money", required: true },
        deadline: { type: "datetime" },
        status: {
          type: "enum",
          values: ["draft", "published", "closed"],
          default: "draft",
        },
      },
    },
  },
};

const workzillaIntents = {
  createTask: {
    target: "Task",
    alpha: "insert",
    creates: "Task",
    permittedFor: ["customer"],
    parameters: {
      title: { type: "string", required: true },
      budget: { type: "number", required: true },
      deadline: { type: "datetime" },
    },
    // confirmation опущен — normalizeIntentNative инферит "form" для
    // multi-param insert intent'а. Явный "enter" был бы inconsistent
    // для 3-полевого creator'а (§9.10).
    particles: {
      effects: [{ target: "Task", op: "insert" }],
    },
  },
  editTask: {
    target: "Task",
    alpha: "replace",
    permittedFor: ["customer"],
    parameters: {
      id: { type: "string", required: true },
      title: { type: "string" },
      budget: { type: "number" },
    },
    particles: { effects: [{ target: "Task", op: "replace" }] },
  },
  publishTask: {
    target: "Task",
    alpha: "replace",
    permittedFor: ["customer"],
    parameters: { id: { type: "string", required: true } },
    particles: { effects: [{ target: "Task", op: "replace" }] },
  },
};

describe("crystallizeV2: native-format scaffold (backlog §8.1)", () => {
  it("native task_list catalog получает item-intents (editTask, publishTask) и toolbar creator (createTask)", () => {
    const projections = {
      task_list: {
        kind: "catalog",
        mainEntity: "Task",
        entities: ["Task"],
        witnesses: ["title", "budget", "deadline", "status"],
      },
    };
    const artifacts = crystallizeV2(workzillaIntents, projections, workzillaOntology, "workzilla");
    const art = artifacts.task_list;
    expect(art).toBeDefined();

    // createTask — creator → toolbar (с overlay для form-confirmation).
    // heroCreate guard: confirmation=enter → inlineInput, но budget+deadline
    // делают heroCreate неуместным (multi-param). Ожидаем что он попадает в
    // toolbar или overlay.
    const toolbarIntentIds = (art.slots.toolbar || [])
      .map(t => t.intentId || t.trigger?.intentId || (t.type === "overflow" ? t.children?.map(c => c.intentId || c.trigger?.intentId) : null))
      .flat().filter(Boolean);
    // createTask должен появиться где-то (toolbar / hero / overflow).
    const heroIntentIds = (art.slots.hero || []).map(h => h.intentId);
    const allCreatorSlots = [...toolbarIntentIds, ...heroIntentIds];
    expect(allCreatorSlots).toContain("createTask");

    // editTask, publishTask — mutate Task, но target=Task (не dotted) →
    // после нормализации target="task" (singular lower). mutatesMain
    // сейчас ждёт dotted OR equal to lower → `task === task` true.
    const itemIntents = art.slots.body?.item?.intents || [];
    const itemIntentIds = itemIntents.map(i => i.intentId);
    expect(itemIntentIds).toContain("editTask");
    expect(itemIntentIds).toContain("publishTask");
  });

  it("native task_detail detail-артефакт получает toolbar с publishTask + editTask", () => {
    const projections = {
      task_detail: {
        kind: "detail",
        mainEntity: "Task",
        entities: ["Task"],
        witnesses: ["title", "budget", "deadline", "status"],
      },
    };
    const artifacts = crystallizeV2(workzillaIntents, projections, workzillaOntology, "workzilla");
    const art = artifacts.task_detail;
    expect(art).toBeDefined();

    // editTask, publishTask — должны появиться в toolbar (primaryCTA или
    // overflow).
    const toolbarIds = flatten(art.slots.toolbar || []);
    expect(toolbarIds).toContain("editTask");
    expect(toolbarIds).toContain("publishTask");
  });

  it("native intent без permittedFor — всё равно попадает (нормализация не фильтрует по role)", () => {
    const intents = {
      publicTask: {
        target: "Task",
        alpha: "replace",
        parameters: { id: { type: "string", required: true } },
        particles: { effects: [{ target: "Task", op: "replace" }] },
      },
    };
    const projections = { task_list: { kind: "catalog", mainEntity: "Task", entities: ["Task"] } };
    const artifacts = crystallizeV2(intents, projections, workzillaOntology, "workzilla");
    const itemIntents = artifacts.task_list.slots.body?.item?.intents || [];
    expect(itemIntents.map(i => i.intentId)).toContain("publicTask");
  });
});

function flatten(slots) {
  const ids = [];
  for (const s of slots) {
    if (s?.intentId) ids.push(s.intentId);
    if (s?.trigger?.intentId) ids.push(s.trigger.intentId);
    if (s?.type === "overflow" && Array.isArray(s.children)) {
      for (const c of s.children) {
        if (c?.intentId) ids.push(c.intentId);
        if (c?.trigger?.intentId) ids.push(c.trigger.intentId);
      }
    }
  }
  return ids;
}
