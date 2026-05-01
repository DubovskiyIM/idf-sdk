import { describe, it, expect } from "vitest";
import { PATTERN } from "./entity-row-actions.js";

describe("entity-row-actions pattern", () => {
  it("apply добавляет _actions column когда catalog + modifier intents", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name", label: "Name" }] } };
    const context = {
      projection: { mainEntity: "Tag" },
      intents: {
        alterTag:  { target: "Tag", alpha: "replace", parameters: { name: { type: "string", required: true } } },
        deleteTag: { target: "Tag", alpha: "remove",  parameters: { name: { type: "string", required: true } } },
      },
    };
    const next = PATTERN.structure.apply(slots, context);
    const actionsCol = next.body.columns.find(c => c.key === "_actions");
    expect(actionsCol).toBeDefined();
    expect(actionsCol.kind).toBe("actions");
    expect(actionsCol.actions.length).toBe(2);
    expect(actionsCol.actions.find(a => a.intent === "deleteTag")?.danger).toBe(true);
  });

  it("no-op когда _actions column уже есть (author override)", () => {
    const slots = {
      body: {
        type: "dataGrid",
        columns: [{ key: "name" }, { key: "_actions", label: "Actions", kind: "actions", actions: [] }],
      },
    };
    const next = PATTERN.structure.apply(slots, { projection: { mainEntity: "Tag" }, intents: {} });
    expect(next.body.columns.length).toBe(2);
  });

  it("no-op когда нет modifier intents", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }] } };
    const context = { projection: { mainEntity: "Tag" }, intents: { listTags: { target: "Tag", alpha: "read" } } };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.body.columns.find(c => c.key === "_actions")).toBeUndefined();
  });

  it("no-op когда body.type !== dataGrid", () => {
    const slots = { body: { type: "card", columns: [] } };
    const next = PATTERN.structure.apply(slots, { projection: { mainEntity: "Tag" }, intents: {} });
    expect(next).toEqual(slots);
  });
});
