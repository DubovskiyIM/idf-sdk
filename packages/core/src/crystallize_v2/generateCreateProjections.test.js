import { describe, it, expect } from "vitest";
import {
  generateCreateProjections,
  buildCreateFormSpec,
} from "./formGrouping.js";
import { crystallizeV2 } from "./index.js";

const workzillaOntology = {
  entities: {
    Task: {
      kind: "internal",
      ownerField: "customerId",
      label: "задачу",
      fields: {
        id: { type: "string" },
        customerId: { type: "string" },
        title: { type: "string", required: true },
        description: { type: "textarea" },
        budget: { type: "number", fieldRole: "money", required: true },
        categoryId: { type: "entityRef" },
        deadline: { type: "datetime" },
        status: { type: "enum", values: ["draft", "published"] },
      },
    },
    Category: {
      kind: "reference",
      fields: { id: { type: "string" }, name: { type: "string" } },
    },
  },
};

const workzillaIntents = {
  createTask: {
    target: "Task",
    alpha: "insert",
    creates: "Task",
    parameters: {
      title: { type: "string", required: true },
      description: { type: "textarea" },
      budget: { type: "number", required: true },
      categoryId: { type: "entityRef", required: true },
      deadline: { type: "datetime" },
    },
    particles: {
      confirmation: "enter",
      effects: [{ target: "Task", op: "insert" }],
    },
  },
  editTask: {
    target: "Task",
    alpha: "replace",
    parameters: { id: { type: "string", required: true }, title: { type: "string" } },
    particles: { effects: [{ target: "Task", op: "replace" }] },
  },
};

describe("generateCreateProjections (backlog §8.2)", () => {
  it("создаёт task_create projection для createTask insert-intent'а", () => {
    const result = generateCreateProjections(workzillaIntents, {}, workzillaOntology);
    expect(result).toHaveProperty("task_create");
    const p = result.task_create;
    expect(p.kind).toBe("form");
    expect(p.mode).toBe("create");
    expect(p.mainEntity).toBe("Task");
    expect(p.creatorIntent).toBe("createTask");
    expect(p.name).toBe("Создать задачу");
  });

  it("author-override — если PROJECTIONS['task_create'] уже существует, не перетирает", () => {
    const existing = { task_create: { kind: "form", mainEntity: "Task", authored: true } };
    const result = generateCreateProjections(workzillaIntents, existing, workzillaOntology);
    expect(result).not.toHaveProperty("task_create");
  });

  it("один creator на entity — второй insert-intent игнорируется", () => {
    const intents = {
      createTaskDraft: {
        creates: "Task",
        particles: { effects: [{ α: "add", target: "tasks" }] },
        parameters: [{ name: "title", type: "text" }],
      },
      createTaskPublished: {
        creates: "Task",
        particles: { effects: [{ α: "add", target: "tasks" }] },
        parameters: [{ name: "title", type: "text" }],
      },
    };
    const result = generateCreateProjections(intents, {}, workzillaOntology);
    expect(Object.keys(result)).toEqual(["task_create"]);
    expect(result.task_create.creatorIntent).toBe("createTaskDraft"); // first wins
  });

  it("intent без creates — пропускается", () => {
    const intents = {
      editTask: { particles: { effects: [{ α: "replace", target: "task.title" }] } },
    };
    const result = generateCreateProjections(intents, {}, workzillaOntology);
    expect(result).toEqual({});
  });

  it("creates:Entity не в ontology — пропускается", () => {
    const intents = { createGhost: { creates: "Ghost" } };
    const result = generateCreateProjections(intents, {}, workzillaOntology);
    expect(result).toEqual({});
  });
});

describe("buildCreateFormSpec", () => {
  it("fields берутся из intent.parameters (после normalize — array)", () => {
    const normalized = {
      createTask: {
        creates: "Task",
        parameters: [
          { name: "title", type: "string", required: true },
          { name: "budget", type: "number", required: true },
          { name: "deadline", type: "datetime" },
        ],
      },
    };
    const proj = { kind: "form", mode: "create", mainEntity: "Task", creatorIntent: "createTask" };
    const spec = buildCreateFormSpec(proj, normalized, workzillaOntology);
    expect(spec.fields).toHaveLength(3);
    expect(spec.fields[0]).toMatchObject({ name: "title", type: "string", editable: true, required: true, intentId: "createTask" });
    expect(spec.fields[1]).toMatchObject({ name: "budget", type: "number" });
    expect(spec.fields[2]).toMatchObject({ name: "deadline" });
  });

  it("enum-поля → options из ontology.valueLabels", () => {
    const ontology = {
      entities: {
        Task: {
          fields: {
            status: { type: "enum", values: ["a", "b"], valueLabels: { a: "Alpha", b: "Beta" } },
          },
        },
      },
    };
    const intents = {
      createTask: {
        creates: "Task",
        parameters: [{ name: "status", type: "enum" }],
      },
    };
    const proj = { mode: "create", mainEntity: "Task", creatorIntent: "createTask" };
    const spec = buildCreateFormSpec(proj, intents, ontology);
    expect(spec.fields[0].options).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
  });

  it("SYSTEM_FIELDS (id, createdAt) — пропускаются", () => {
    const intents = {
      createTask: {
        creates: "Task",
        parameters: [
          { name: "id", type: "string" },
          { name: "title", type: "string" },
        ],
      },
    };
    const proj = { mode: "create", mainEntity: "Task", creatorIntent: "createTask" };
    const spec = buildCreateFormSpec(proj, intents, workzillaOntology);
    expect(spec.fields.map(f => f.name)).toEqual(["title"]);
  });

  it("секции генерятся по inferFieldRole", () => {
    const intents = {
      createTask: {
        creates: "Task",
        parameters: [
          { name: "title", type: "string" },
          { name: "budget", type: "number" },
        ],
      },
    };
    const proj = { mode: "create", mainEntity: "Task", creatorIntent: "createTask" };
    const spec = buildCreateFormSpec(proj, intents, workzillaOntology);
    expect(spec.sections.length).toBeGreaterThan(0);
  });
});

describe("crystallizeV2 integration: create-projection появляется в artifacts", () => {
  it("native-format createTask → task_create artifact с formBody", () => {
    const artifacts = crystallizeV2(workzillaIntents, {}, workzillaOntology, "workzilla");
    expect(artifacts).toHaveProperty("task_create");
    const art = artifacts.task_create;
    expect(art.slots.body.type).toBe("formBody");
    expect(art.slots.body.mode).toBe("create");
    expect(art.slots.body.mainEntity).toBe("Task");
    expect(art.slots.body.creatorIntent).toBe("createTask");
    const fieldNames = art.slots.body.fields.map(f => f.name);
    expect(fieldNames).toContain("title");
    expect(fieldNames).toContain("budget");
    expect(fieldNames).toContain("deadline");
  });

  it("авторская task_create projection имеет приоритет", () => {
    const authored = {
      task_create: { kind: "form", mainEntity: "Task", authored: true, creatorIntent: "createTask" },
    };
    const artifacts = crystallizeV2(workzillaIntents, authored, workzillaOntology, "workzilla");
    expect(artifacts.task_create).toBeDefined();
    // authored projection не содержит `mode: "create"`, идёт через buildFormSpec (edit),
    // значит просто поверх authored — артефакт collected как form-kind.
    expect(artifacts.task_create.slots.body.type).toBe("formBody");
  });
});
