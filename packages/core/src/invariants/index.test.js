import { describe, it, expect } from "vitest";
import { checkInvariants, registerKind, KIND_HANDLERS } from "./index.js";

describe("checkInvariants — базовый контракт", () => {
  it("ok:true и пустые violations, если invariants отсутствуют", () => {
    const res = checkInvariants({}, {});
    expect(res).toEqual({ ok: true, violations: [] });
  });

  it("ok:true, если ontology.invariants пуст", () => {
    const res = checkInvariants({}, { invariants: [] });
    expect(res).toEqual({ ok: true, violations: [] });
  });

  it("неизвестный kind → severity:\"warning\", ok остаётся true", () => {
    const res = checkInvariants({}, {
      invariants: [{ name: "custom", kind: "made-up-kind" }],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0]).toMatchObject({
      name: "custom",
      kind: "made-up-kind",
      severity: "warning",
      details: { reason: "unknown_kind" },
    });
  });

  it("handler бросает исключение → severity:\"warning\" (не error), ok остаётся true", () => {
    registerKind("boom", () => {
      throw new TypeError("Cannot read properties of undefined (reading 'split')");
    });
    try {
      const res = checkInvariants({}, {
        invariants: [{ name: "buggy", kind: "boom" }],
      });
      expect(res.ok).toBe(true);
      expect(res.violations).toHaveLength(1);
      expect(res.violations[0].severity).toBe("warning");
      expect(res.violations[0].details.reason).toBe("handler_threw");
      expect(res.violations[0].details.error).toContain("TypeError");
    } finally {
      delete KIND_HANDLERS.boom;
    }
  });
});

describe("referential — альтернативная форма {entity, field, references}", () => {
  const world = {
    deals: [{ id: "d1", customerId: "u1" }, { id: "d2", customerId: "u_ghost" }],
    users: [{ id: "u1" }],
  };

  it("поддерживает {from, to} (канон)", () => {
    const res = checkInvariants(world, {
      invariants: [
        { name: "canon", kind: "referential", from: "Deal.customerId", to: "User.id" },
      ],
    });
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].details.danglingValue).toBe("u_ghost");
  });

  it("поддерживает {entity, field, references} (freelance/delivery форма)", () => {
    const res = checkInvariants(world, {
      invariants: [
        {
          name: "alt",
          kind: "referential",
          entity: "Deal",
          field: "customerId",
          references: "User.id",
        },
      ],
    });
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].details.danglingValue).toBe("u_ghost");
  });

  it("{entity, field, references} с allowNull", () => {
    const res = checkInvariants(
      { deals: [{ id: "d1", customerId: null }], users: [] },
      {
        invariants: [{
          name: "alt-null", kind: "referential",
          entity: "Deal", field: "customerId", references: "User.id",
          allowNull: true,
        }],
      }
    );
    expect(res.ok).toBe(true);
  });
});

describe("aggregate — альтернативная форма {entity, field, formula}", () => {
  const world = {
    orders: [{ id: "o1", total: 100 }],
    payments: [{ orderId: "o1", price: 40 }, { orderId: "o1", price: 50 }],
  };

  it("поддерживает {from, target, op, where} (канон)", () => {
    const res = checkInvariants(world, {
      invariants: [{
        name: "sum-canon",
        kind: "aggregate",
        op: "sum",
        from: "Payment.price",
        target: "Order.total",
        where: { orderId: "$target.id" },
        tolerance: 0,
      }],
    });
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.computed).toBe(90);
    expect(res.violations[0].details.expected).toBe(100);
  });

  it("поддерживает {entity, field, formula:{op, of, where}} (freelance форма)", () => {
    const res = checkInvariants(world, {
      invariants: [{
        name: "sum-alt",
        kind: "aggregate",
        entity: "Order",
        field: "total",
        formula: {
          op: "sum",
          of: "Payment.price",
          where: { orderId: "$target.id" },
        },
      }],
    });
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.computed).toBe(90);
  });
});

describe("invariant.where — scope по row (1.4)", () => {
  it("transition: where фильтрует rows по полю (namespace-like scoping)", () => {
    const world = {
      tasks: [
        { id: "t1", status: "active", domain: "freelance" },
        { id: "t2", status: "some-alien-state", domain: "lifequest" },
      ],
    };
    const res = checkInvariants(world, {
      invariants: [{
        name: "freelance-only", kind: "transition",
        entity: "Task", field: "status",
        where: { domain: "freelance" },
        allowed: ["active", "done"],
      }],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it("referential: where фильтрует fromRows", () => {
    const world = {
      items: [
        { id: "i1", userId: "u1", domain: "freelance" },
        { id: "i2", userId: "u_ghost", domain: "lifequest" },
      ],
      users: [{ id: "u1" }],
    };
    const res = checkInvariants(world, {
      invariants: [{
        name: "scoped", kind: "referential",
        from: "Item.userId", to: "User.id",
        where: { domain: "freelance" },
      }],
    });
    expect(res.ok).toBe(true);
  });

  it("aggregate: where на target-коллекции (помимо $target-подстановки в формулу)", () => {
    const world = {
      orders: [
        { id: "o1", total: 100, domain: "freelance" },
        { id: "o2", total: 999, domain: "other" },
      ],
      payments: [{ orderId: "o1", price: 100 }],
    };
    const res = checkInvariants(world, {
      invariants: [{
        name: "scoped-agg", kind: "aggregate",
        op: "sum",
        from: "Payment.price",
        target: "Order.total",
        where: { orderId: "$target.id", domain: "freelance" },
      }],
    });
    expect(res.ok).toBe(true);
  });
});

describe("transition — альтернативная форма {allowed}", () => {
  const world = { tasks: [{ id: "t1", status: "active" }] };

  it("поддерживает {order} (канон)", () => {
    const res = checkInvariants(world, {
      invariants: [{
        name: "order", kind: "transition",
        entity: "Task", field: "status",
        order: ["draft", "active", "done"],
      }],
    });
    expect(res.ok).toBe(true);
  });

  it("поддерживает {allowed} как whitelist значений", () => {
    const res = checkInvariants(world, {
      invariants: [{
        name: "allowed", kind: "transition",
        entity: "Task", field: "status",
        allowed: ["draft", "active", "done"],
      }],
    });
    expect(res.ok).toBe(true);
  });

  it("{allowed} — значение не в whitelist → violation", () => {
    const res = checkInvariants(
      { tasks: [{ id: "t1", status: "unknown-state" }] },
      {
        invariants: [{
          name: "strict", kind: "transition",
          entity: "Task", field: "status",
          allowed: ["draft", "active", "done"],
        }],
      }
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.reason).toBe("not_in_allowed_set");
  });
});
