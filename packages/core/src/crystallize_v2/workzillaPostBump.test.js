/**
 * Workzilla post-bump SDK fixes (backlog §9.1 / §9.2 / §9.3).
 */
import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";
import { deriveProjections } from "./deriveProjections.js";
import { mapOntologyTypeToControl } from "./ontologyHelpers.js";
import { inferControlType } from "./inferControlType.js";

const ontology = {
  name: "workzilla",
  entities: {
    Category: {
      kind: "reference",
      fields: {
        id: { type: "text", readOnly: true },
        name: { type: "text", required: true, label: "Название" },
      },
    },
    Task: {
      kind: "internal",
      ownerField: "customerId",
      fields: {
        id: { type: "text", readOnly: true },
        customerId: { type: "text", required: true, readOnly: true },
        title: { type: "text", required: true, label: "Название" },
        categoryId: { type: "entityRef", entity: "Category", required: true, label: "Категория" },
        budget: { type: "number", fieldRole: "money", required: true, label: "Бюджет" },
        status: {
          type: "enum",
          values: ["draft", "published"],
          valueLabels: { draft: "Черновик", published: "Опубликовано" },
          default: "draft",
          label: "Статус",
        },
      },
      relations: { categoryId: { entity: "Category", kind: "belongs-to" } },
    },
    Response: {
      kind: "internal",
      ownerField: "executorId",
      fields: {
        id: { type: "text", readOnly: true },
        executorId: { type: "text", required: true, readOnly: true },
        taskId: { type: "text", required: true },
        price: { type: "number", fieldRole: "money", required: true },
        status: { type: "enum", values: ["pending", "withdrawn"], default: "pending" },
      },
      relations: {
        taskId: { entity: "Task", kind: "belongs-to" },
        executorId: { entity: "User", kind: "belongs-to" },
      },
    },
  },
  intents: {
    createTaskDraft: {
      target: "Task",
      alpha: "insert",
      creates: "Task",
      parameters: {
        title: { type: "text", required: true },
        categoryId: { type: "entityRef", entity: "Category", required: true },
        budget: { type: "number", required: true },
      },
      particles: { confirmation: "form", effects: [{ target: "Task", op: "insert" }] },
    },
    editTask: {
      target: "Task",
      alpha: "replace",
      parameters: { id: { type: "text", required: true }, title: { type: "text" } },
      particles: { effects: [{ target: "Task", op: "replace" }] },
    },
    publishTask: {
      target: "Task",
      alpha: "replace",
      parameters: { id: { type: "text", required: true } },
      particles: { effects: [{ target: "Task", op: "replace" }] },
    },
    createResponse: {
      target: "Response",
      alpha: "insert",
      creates: "Response",
      parameters: { taskId: { type: "text", required: true }, price: { type: "number", required: true } },
      particles: { confirmation: "form", effects: [{ target: "Response", op: "insert" }] },
    },
    editResponse: {
      target: "Response",
      alpha: "replace",
      parameters: { id: { type: "text", required: true } },
      particles: { effects: [{ target: "Response", op: "replace" }] },
    },
    withdrawResponse: {
      target: "Response",
      alpha: "replace",
      parameters: { id: { type: "text", required: true } },
      particles: { effects: [{ target: "Response", op: "replace" }] },
    },
    // view-intents для nav-graph item-click edge generation.
    viewTask: { target: "Task", parameters: { id: { type: "text", required: true } } },
    viewResponse: { target: "Response", parameters: { id: { type: "text", required: true } } },
    listTask: { target: "Task", parameters: {} },
    listResponse: { target: "Response", parameters: {} },
  },
};

describe("§9.1 — native type → canonical control mapping", () => {
  it("mapOntologyTypeToControl принимает 'string' → 'text'", () => {
    expect(mapOntologyTypeToControl("string")).toBe("text");
    expect(mapOntologyTypeToControl("int")).toBe("number");
    expect(mapOntologyTypeToControl("integer")).toBe("number");
    expect(mapOntologyTypeToControl("float")).toBe("number");
    expect(mapOntologyTypeToControl("bool")).toBe("select");
  });

  it("mapOntologyTypeToControl сохраняет canonical types", () => {
    expect(mapOntologyTypeToControl("text")).toBe("text");
    expect(mapOntologyTypeToControl("textarea")).toBe("textarea");
    expect(mapOntologyTypeToControl("entityRef")).toBe("select");
  });

  it("mapOntologyTypeToControl fallback → 'text' для unknown", () => {
    expect(mapOntologyTypeToControl("zorblax")).toBe("text");
    expect(mapOntologyTypeToControl(undefined)).toBe("text");
  });

  it("inferControlType мапит param.type='string' → 'text'", () => {
    expect(inferControlType({ name: "x", type: "string" }, ontology)).toBe("text");
  });

  it("inferControlType мапит param.type='entityRef' → 'select'", () => {
    expect(inferControlType({ name: "categoryId", type: "entityRef" }, ontology)).toBe("select");
  });
});

describe("§9.2 — deriveProjections ставит idParam на detail", () => {
  it("task_detail.idParam === 'taskId'", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    expect(derived.task_detail).toBeDefined();
    expect(derived.task_detail.idParam).toBe("taskId");
  });

  it("response_detail.idParam === 'responseId'", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    expect(derived.response_detail?.idParam).toBe("responseId");
  });

  it("my_<entity>_detail (singleton) не получает idParam", () => {
    const onto = {
      ...ontology,
      entities: {
        ...ontology.entities,
        Wallet: {
          kind: "internal", ownerField: "userId", singleton: true,
          fields: { id: {}, userId: {}, balance: { type: "number", fieldRole: "money" } },
        },
      },
      intents: {
        ...ontology.intents,
        topUp: { target: "Wallet", alpha: "replace", parameters: { id: {} }, particles: { effects: [{ target: "Wallet", op: "replace" }] } },
        withdraw: { target: "Wallet", alpha: "replace", parameters: { id: {} }, particles: { effects: [{ target: "Wallet", op: "replace" }] } },
      },
    };
    const derived = deriveProjections(onto.intents, onto);
    expect(derived.my_wallet_detail?.singleton).toBe(true);
    expect(derived.my_wallet_detail?.idParam).toBeUndefined();
  });
});

describe("§9.3 — onItemClick routing предпочитает detail с matching mainEntity", () => {
  it("task_list.onItemClick → task_detail (не response_detail, alphabetically first)", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const arts = crystallizeV2(ontology.intents, derived, ontology, "workzilla");
    const taskList = arts.task_list;
    expect(taskList?.slots?.body?.onItemClick?.to).toBe("task_detail");
  });

  it("response_list.onItemClick → response_detail", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const arts = crystallizeV2(ontology.intents, derived, ontology, "workzilla");
    const respList = arts.response_list;
    expect(respList?.slots?.body?.onItemClick?.to).toBe("response_detail");
  });

  it("authored projection.onItemClick override сохраняется", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const authored = {
      ...derived,
      task_list: {
        ...derived.task_list,
        onItemClick: { action: "navigate", to: "custom_view", params: { x: "item.id" } },
      },
    };
    const arts = crystallizeV2(ontology.intents, authored, ontology, "workzilla");
    expect(arts.task_list?.slots?.body?.onItemClick?.to).toBe("custom_view");
  });
});

// §13 (Notion field-test 2026-04-27) — string-shorthand auto-coerce
describe("§13 — onItemClick: \"projId\" string-shorthand auto-coerce", () => {
  it("string-shorthand → structured action с idParam от target projection", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const authored = {
      ...derived,
      task_list: {
        ...derived.task_list,
        onItemClick: "task_detail",  // string shorthand
      },
    };
    const arts = crystallizeV2(ontology.intents, authored, ontology, "workzilla");
    const oc = arts.task_list?.slots?.body?.onItemClick;
    expect(oc).toEqual({
      action: "navigate",
      to: "task_detail",
      params: { taskId: "item.id" },  // taskId = task_detail.idParam
    });
  });

  it("если target.idParam отсутствует → fallback на 'id'", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const authored = {
      ...derived,
      task_list: {
        ...derived.task_list,
        onItemClick: "unknown_target",  // нет такой projection в map
      },
    };
    const arts = crystallizeV2(ontology.intents, authored, ontology, "workzilla");
    const oc = arts.task_list?.slots?.body?.onItemClick;
    expect(oc).toEqual({
      action: "navigate",
      to: "unknown_target",
      params: { id: "item.id" },
    });
  });

  it("structured action не coerc'ится (backward-compat)", () => {
    const derived = deriveProjections(ontology.intents, ontology);
    const authored = {
      ...derived,
      task_list: {
        ...derived.task_list,
        onItemClick: { action: "navigate", to: "x", params: { foo: "bar" } },
      },
    };
    const arts = crystallizeV2(ontology.intents, authored, ontology, "workzilla");
    expect(arts.task_list?.slots?.body?.onItemClick).toEqual({
      action: "navigate", to: "x", params: { foo: "bar" },
    });
  });
});
