import { describe, it, expect } from "vitest";
import { buildIntents } from "../src/buildIntents.js";

describe("buildIntents", () => {
  it("создаёт 5 CRUD-intent'ов для entity Task", () => {
    const intents = buildIntents({
      name: "Task",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: { type: "string" },
      },
    });

    expect(Object.keys(intents).sort()).toEqual([
      "createTask",
      "listTask",
      "readTask",
      "removeTask",
      "updateTask",
    ]);
  });

  it("createTask: alpha:insert + parameters из non-readOnly полей", () => {
    const intents = buildIntents({
      name: "Task",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: { type: "string" },
      },
    });
    const c = intents.createTask;
    expect(c.target).toBe("Task");
    expect(c.alpha).toBe("insert");
    expect(c.parameters.title).toBeDefined();
    expect(c.parameters.status).toBeDefined();
    expect(c.parameters.id).toBeUndefined();
  });

  it("updateTask: alpha:replace + id как required", () => {
    const intents = buildIntents({
      name: "Task",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string" },
      },
    });
    expect(intents.updateTask.alpha).toBe("replace");
    expect(intents.updateTask.parameters.id.required).toBe(true);
  });

  it("removeTask: alpha:remove + только id как parameter", () => {
    const intents = buildIntents({
      name: "Task",
      fields: { id: { type: "string", readOnly: true }, title: { type: "string" } },
    });
    expect(intents.removeTask.alpha).toBe("remove");
    expect(Object.keys(intents.removeTask.parameters)).toEqual(["id"]);
  });

  it("listTask / readTask — query без alpha", () => {
    const intents = buildIntents({
      name: "Task",
      fields: { id: { type: "string", readOnly: true } },
    });
    expect(intents.listTask.alpha).toBeUndefined();
    expect(intents.readTask.alpha).toBeUndefined();
    expect(intents.readTask.parameters.id.required).toBe(true);
  });
});
