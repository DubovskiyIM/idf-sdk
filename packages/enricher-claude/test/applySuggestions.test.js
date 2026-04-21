import { describe, it, expect } from "vitest";
import { applySuggestions } from "../src/applySuggestions.js";

function baseOntology() {
  return {
    name: "default",
    entities: {
      Order: {
        name: "Order",
        kind: "internal",
        fields: {
          id: { type: "string", readOnly: true },
          status: { type: "string" },
          total: { type: "number", role: "money" },
        },
      },
      OrderItem: {
        name: "OrderItem",
        kind: "internal",
        fields: {
          id: { type: "string", readOnly: true },
          order_id: { type: "string" },
        },
      },
    },
    intents: {
      createOrder: { target: "Order", alpha: "insert", parameters: {} },
    },
    roles: { owner: { base: "owner" } },
  };
}

describe("applySuggestions", () => {
  it("namedIntents → добавляются в intents", () => {
    const suggestions = {
      namedIntents: [
        { name: "approve_order", target: "Order", alpha: "replace", reason: "status has approved" },
      ],
      absorbHints: [],
      additionalRoles: [],
      baseRoles: [],
    };

    const result = applySuggestions(baseOntology(), suggestions);
    expect(result.intents.approve_order).toBeDefined();
    expect(result.intents.approve_order.target).toBe("Order");
    expect(result.intents.approve_order.alpha).toBe("replace");
    // Witness-комментарий с reason
    expect(result.intents.approve_order.__witness).toMatch(/status has approved/);
  });

  it("не перезаписывает существующий intent", () => {
    const suggestions = {
      namedIntents: [
        { name: "createOrder", target: "Order", alpha: "insert", reason: "conflict" },
      ],
      absorbHints: [],
      additionalRoles: [],
      baseRoles: [],
    };

    const input = baseOntology();
    const result = applySuggestions(input, suggestions);
    expect(result.intents.createOrder).toEqual(input.intents.createOrder);
  });

  it("additionalRoles → патчат field.role", () => {
    const suggestions = {
      namedIntents: [],
      absorbHints: [],
      additionalRoles: [
        { entity: "Order", field: "status", role: "status-enum", reason: "enum-like" },
      ],
      baseRoles: [],
    };

    const result = applySuggestions(baseOntology(), suggestions);
    expect(result.entities.Order.fields.status.role).toBe("status-enum");
  });

  it("baseRoles → дописывают в roles", () => {
    const suggestions = {
      namedIntents: [],
      absorbHints: [],
      additionalRoles: [],
      baseRoles: [{ role: "admin", reason: "is_admin column" }],
    };

    const result = applySuggestions(baseOntology(), suggestions);
    expect(result.roles.admin).toEqual({ base: "admin" });
  });

  it("absorbHints → absorbedBy на child", () => {
    const suggestions = {
      namedIntents: [],
      absorbHints: [
        { child: "OrderItem", parent: "Order", reason: "FK + catalog" },
      ],
      additionalRoles: [],
      baseRoles: [],
    };

    const result = applySuggestions(baseOntology(), suggestions);
    expect(result.entities.OrderItem.absorbedBy).toBe("Order_detail");
  });

  it("opts.only фильтрует применяемые suggestions", () => {
    const suggestions = {
      namedIntents: [
        { name: "publish_order", target: "Order", alpha: "replace", reason: "x" },
      ],
      absorbHints: [],
      additionalRoles: [
        { entity: "Order", field: "status", role: "status-enum", reason: "y" },
      ],
      baseRoles: [],
    };

    const result = applySuggestions(baseOntology(), suggestions, {
      only: ["namedIntents"],
    });
    expect(result.intents.publish_order).toBeDefined();
    // status.role НЕ применялся (only=namedIntents), поэтому остался undefined
    expect(result.entities.Order.fields.status.role).toBeUndefined();
  });

  it("не мутирует input ontology", () => {
    const input = baseOntology();
    const snap = JSON.stringify(input);
    applySuggestions(input, {
      namedIntents: [{ name: "x", target: "Order", alpha: "replace", reason: "r" }],
      absorbHints: [],
      additionalRoles: [],
      baseRoles: [],
    });
    expect(JSON.stringify(input)).toBe(snap);
  });
});
