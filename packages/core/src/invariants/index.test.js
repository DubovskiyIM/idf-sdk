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

describe("expression kind (backlog 1.2)", () => {
  it("predicate-функция: true → нет violations", () => {
    const res = checkInvariants(
      { deals: [{ id: "d1", customerId: "u1", executorId: "u2" }] },
      {
        invariants: [{
          name: "no-self-deal", kind: "expression",
          entity: "Deal",
          predicate: (r) => r.customerId !== r.executorId,
        }],
      }
    );
    expect(res.ok).toBe(true);
  });

  it("predicate-функция: false → violation", () => {
    const res = checkInvariants(
      { deals: [{ id: "d1", customerId: "u1", executorId: "u1" }] },
      {
        invariants: [{
          name: "no-self-deal", kind: "expression",
          entity: "Deal",
          predicate: (r) => r.customerId !== r.executorId,
          message: "customerId !== executorId",
        }],
      }
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0].message).toContain("customerId !== executorId");
  });

  it("expression-строка: парсится и применяется", () => {
    const res = checkInvariants(
      { tasks: [{ id: "t1", minPrice: 100, maxPrice: 50 }] },
      {
        invariants: [{
          name: "price-order", kind: "expression",
          entity: "Task",
          expression: "minPrice <= maxPrice",
        }],
      }
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.reason).toBe("predicate_false");
  });

  it("where: предикат применяется к отфильтрованным", () => {
    const res = checkInvariants(
      {
        deals: [
          { id: "d1", customerId: "u1", executorId: "u1", domain: "lifequest" },
          { id: "d2", customerId: "u1", executorId: "u2", domain: "freelance" },
        ],
      },
      {
        invariants: [{
          name: "freelance-only", kind: "expression",
          entity: "Deal",
          where: { domain: "freelance" },
          predicate: (r) => r.customerId !== r.executorId,
        }],
      }
    );
    expect(res.ok).toBe(true);
  });

  it("predicate получает world для cross-entity lookup (compliance-домен)", () => {
    const world = {
      approvals:      [{ id: "a1", role: "cfo", entryId: "je1", approverId: "carol" }],
      journalentries: [{ id: "je1", preparerId: "carol", amount: 200000 }],
    };
    const res = checkInvariants(world, {
      invariants: [{
        name: "sod-cfo-neq-own-je", kind: "expression",
        entity: "Approval",
        where: { role: "cfo" },
        predicate: (row, w) => {
          const je = w.journalentries.find(j => j.id === row.entryId);
          return !je || row.approverId !== je.preparerId;
        },
      }],
    });
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.id).toBe("a1");
    expect(res.violations[0].details.reason).toBe("predicate_false");
  });

  it("predicate получает viewer из opts (role-aware)", () => {
    const world = { entries: [{ id: "je1" }] };
    const res = checkInvariants(
      world,
      {
        invariants: [{
          name: "auditor-read-only", kind: "expression",
          entity: "Entry",
          predicate: (row, _w, viewer) => viewer?.role !== "auditor",
        }],
      },
      { viewer: { role: "auditor" } },
    );
    expect(res.ok).toBe(false);
  });

  it("predicate получает context из opts (alpha-aware)", () => {
    const world = { entries: [{ id: "je1" }] };
    const res = checkInvariants(
      world,
      {
        invariants: [{
          name: "no-update-in-this-context", kind: "expression",
          entity: "Entry",
          predicate: (row, _w, _v, ctx) => ctx?.alpha !== "update",
        }],
      },
      { context: { alpha: "update" } },
    );
    expect(res.ok).toBe(false);
  });

  it("expression-строка видит world, viewer, context как отдельные имена", () => {
    const world = {
      tasks: [{ id: "t1", customerId: "u1" }],
      users: [{ id: "u1", role: "owner" }],
    };
    const res = checkInvariants(
      world,
      {
        invariants: [{
          name: "customer-exists-and-not-viewer", kind: "expression",
          entity: "Task",
          expression: "world.users.some(u => u.id === customerId) && customerId !== viewer.id",
        }],
      },
      { viewer: { id: "u2" } },
    );
    expect(res.ok).toBe(true);
  });
});

describe("cardinality composite groupBy (backlog 1.3)", () => {
  it("один активный Response на пару (executorId, taskId)", () => {
    const res = checkInvariants(
      {
        responses: [
          { id: "r1", executorId: "u1", taskId: "t1", status: "active" },
          { id: "r2", executorId: "u1", taskId: "t1", status: "active" },
          { id: "r3", executorId: "u2", taskId: "t1", status: "active" },
        ],
      },
      {
        invariants: [{
          name: "one-response-per-pair", kind: "cardinality",
          entity: "Response",
          where: { status: "active" },
          groupBy: ["executorId", "taskId"],
          max: 1,
        }],
      }
    );
    expect(res.ok).toBe(false);
    const violation = res.violations[0];
    expect(violation.details.count).toBe(2);
    expect(violation.details.max).toBe(1);
  });

  it("single groupBy продолжает работать (back-compat)", () => {
    const res = checkInvariants(
      {
        items: [
          { id: "i1", userId: "u1" },
          { id: "i2", userId: "u1" },
        ],
      },
      {
        invariants: [{
          name: "one-per-user", kind: "cardinality",
          entity: "Item",
          groupBy: "userId",
          max: 1,
        }],
      }
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0].details.count).toBe(2);
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
