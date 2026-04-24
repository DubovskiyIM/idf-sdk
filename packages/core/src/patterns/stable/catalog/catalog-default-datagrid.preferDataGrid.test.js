// G-K-22 (Keycloak dogfood, 2026-04-23): catalog-default-datagrid avoid'ит
// trespass когда body.item.intents непустой ("catalog-action-cta уже
// решил"). Это блокирует DataGrid для admin-CRUD каталогов с per-row
// CRUD-действиями. ontology.features.preferDataGrid: true — switch для
// override поведения, генерирует DataGrid + actions-column из item.intents.
import { describe, it, expect } from "vitest";
import catalogDefaultDataGrid from "./catalog-default-datagrid.js";

const apply = catalogDefaultDataGrid.structure.apply;

const baseSlots = () => ({
  header: [], toolbar: [], hero: [],
  body: {
    type: "list",
    item: {
      intents: [
        { intentId: "removeUser", opens: "overlay", overlayKey: "overlay_removeUser", icon: "⚡" },
        { intentId: "updateUser", opens: "overlay", overlayKey: "overlay_updateUser", icon: "✎" },
      ],
    },
  },
  context: [], fab: [], overlay: [],
});

const baseContext = (preferDataGrid = false) => ({
  projection: {
    archetype: "catalog",
    mainEntity: "User",
    witnesses: ["username", "email", "enabled"],
  },
  ontology: {
    entities: {
      User: { fields: { username: { type: "text" }, email: { type: "text" }, enabled: { type: "boolean" } } },
    },
    features: preferDataGrid ? { preferDataGrid: true } : {},
  },
});

describe("G-K-22: ontology.features.preferDataGrid switch", () => {
  it("default (preferDataGrid не set) — catalog-default-datagrid НЕ apply при body.item.intents", () => {
    const result = apply(baseSlots(), baseContext(false));
    expect(result.body.type).toBe("list"); // не trespass
  });

  it("preferDataGrid:true — apply DataGrid + сохраняет item.intents как actions-column", () => {
    const result = apply(baseSlots(), baseContext(true));
    expect(result.body.type).toBe("dataGrid");
    expect(result.body.source).toBe("users");
    expect(Array.isArray(result.body.columns)).toBe(true);
    // witnesses columns
    const dataKeys = result.body.columns.filter(c => c.kind !== "actions").map(c => c.key);
    expect(dataKeys).toEqual(expect.arrayContaining(["username", "email", "enabled"]));
    // actions column добавлена из body.item.intents
    const actionsCol = result.body.columns.find(c => c.kind === "actions");
    expect(actionsCol).toBeDefined();
    expect(Array.isArray(actionsCol.actions)).toBe(true);
    const intentNames = actionsCol.actions.map(a => a.intent);
    expect(intentNames).toEqual(expect.arrayContaining(["removeUser", "updateUser"]));
  });

  it("preferDataGrid:true но body уже dataGrid — no-op (author wins)", () => {
    const slots = baseSlots();
    slots.body = { type: "dataGrid", source: "users", columns: [{ key: "x" }] };
    const result = apply(slots, baseContext(true));
    expect(result.body.columns).toEqual([{ key: "x" }]); // unchanged
  });

  it("preferDataGrid:true но projection.bodyOverride задан — no-op (author wins)", () => {
    const ctx = baseContext(true);
    ctx.projection.bodyOverride = { type: "dataGrid" };
    const result = apply(baseSlots(), ctx);
    expect(result.body.type).toBe("list"); // bodyOverride preserved upstream
  });

  it("preferDataGrid:true без item.intents — обычный DataGrid без actions", () => {
    const slots = baseSlots();
    slots.body.item = {}; // no intents
    const result = apply(slots, baseContext(true));
    expect(result.body.type).toBe("dataGrid");
    const actionsCol = result.body.columns.find(c => c.kind === "actions");
    expect(actionsCol).toBeUndefined();
  });
});
