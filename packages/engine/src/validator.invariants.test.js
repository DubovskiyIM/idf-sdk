/**
 * Интеграционные тесты: checkInvariants + validator.submit.
 *
 * Портировано из host: server/validator.invariants.test.js.
 * Адаптация:
 *  - ontology.entities — объект { EntityName: {...} }, не массив (buildTypeMap из fold.js).
 *  - transition: inv.transitions: [["from","to"]] — не inv.allowed:[{from,to}].
 *  - expression: inv.expression — строка (или inv.predicate — функция), не inv.predicate: строка.
 *  - Используем createValidator + createInMemoryPersistence (не прямой import checkInvariants).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createValidator } from "./validator.js";
import { createInMemoryPersistence } from "./persistence/inMemory.js";
import { checkInvariants } from "@intent-driven/core";

/**
 * Фабрика для тестов.
 * seedEffects записываются как confirmed через appendEffect.
 */
async function mkValidator(ontology = {}, seedEffects = [], opts = {}) {
  const clock = opts.clock || (() => 1000);
  const persistence = createInMemoryPersistence({ clock });
  for (const e of seedEffects) {
    await persistence.appendEffect({ ...e, status: "confirmed" });
  }
  const validator = createValidator({
    persistence,
    ontology,
    validateIntentConditions: opts.validateIntentConditions || (() => ({ ok: true })),
    clock,
  });
  return { validator, persistence };
}

// ============================================================================
// Прямая проверка checkInvariants (smoke — без submit)
// ============================================================================

describe("интеграция: checkInvariants + foldWorld world shape", () => {
  it("контракт: world — это plain object с plural-ключами к массивам", () => {
    const world = {
      portfolios: [{ id: "p1", totalValue: 100 }],
      positions:  [{ id: "x", portfolioId: "p1", value: 100 }],
    };
    const ontology = {
      invariants: [{ name: "s", kind: "aggregate", op: "sum",
        from: "Position.value", where: { portfolioId: "$target.id" },
        target: "Portfolio.totalValue", tolerance: 0 }],
    };
    expect(checkInvariants(world, ontology).ok).toBe(true);
  });

  it("world от foldWorld совместим с checkInvariants (smoke)", () => {
    const r = checkInvariants({}, { invariants: [] });
    expect(r.ok).toBe(true);
  });
});

// ============================================================================
// foldWorld: коллекции строятся корректно из seed-эффектов
// ============================================================================

describe("foldWorld: aggregate world корректно строится из confirmed эффектов", () => {
  it("add-эффекты формируют коллекции с правильной формой", async () => {
    // entities — объект (не массив), иначе buildTypeMap не видит имён
    const { validator } = await mkValidator(
      { entities: { Portfolio: {} } },
      [
        {
          id: "ef1", intent_id: "create_portfolio", alpha: "add", target: "Portfolio",
          context: { id: "p1", totalValue: 100 }, value: null,
          created_at: 1000, resolved_at: 1000, scope: "user",
        },
        {
          id: "ef2", intent_id: "create_portfolio", alpha: "add", target: "Portfolio",
          context: { id: "p2", totalValue: 200 }, value: null,
          created_at: 2000, resolved_at: 2000, scope: "user",
        },
      ],
    );

    const world = await validator.foldWorld();
    expect(Array.isArray(world.portfolios)).toBe(true);
    expect(world.portfolios).toHaveLength(2);
    expect(world.portfolios.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("world пуст когда нет confirmed эффектов", async () => {
    const { validator } = await mkValidator({ invariants: [] });
    const world = await validator.foldWorld();
    expect(Object.keys(world)).toHaveLength(0);
  });
});

// ============================================================================
// Invariant kinds: smoke через submit
// ============================================================================

describe("invariant kinds: smoke через submit", () => {
  let tick;
  let clock;

  beforeEach(() => {
    tick = 1000;
    clock = () => tick++;
  });

  // --------------------------------------------------------------------------
  // referential: ссылка на несуществующую сущность
  // --------------------------------------------------------------------------
  it("kind:referential — нарушение при ссылке на несуществующий parent", async () => {
    const ontology = {
      entities: { Category: {}, Item: {} },
      invariants: [
        {
          name: "item_category_ref",
          kind: "referential",
          // normalizeInvariant поддерживает {entity, field, references} → {from, to}
          entity: "Item",
          field: "categoryId",
          references: "Category.id",
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    // Нет ни одной Category в мире — ссылка оборвана
    const result = await validator.submit({
      id: "ef-item1", intent_id: "create_item", alpha: "add", target: "Item",
      status: "proposed", context: { id: "item1", categoryId: "cat999" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });

  it("kind:referential — ok когда reference существует", async () => {
    const ontology = {
      entities: { Category: {}, Item: {} },
      invariants: [
        {
          name: "item_category_ref",
          kind: "referential",
          entity: "Item",
          field: "categoryId",
          references: "Category.id",
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    // Сначала добавляем Category
    await validator.submit({
      id: "ef-cat1", intent_id: "create_category", alpha: "add", target: "Category",
      status: "proposed", context: { id: "cat1", name: "Electronics" },
      value: null, created_at: tick,
    });

    // Теперь Item со ссылкой на существующую Category
    const result = await validator.submit({
      id: "ef-item1", intent_id: "create_item", alpha: "add", target: "Item",
      status: "proposed", context: { id: "item1", categoryId: "cat1" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // transition: запрещённый статус (вне allowedSet)
  //
  // Примечание: transition handler без opts.history проверяет что текущее
  // значение поля входит в allowedSet (объединение всех состояний из transitions).
  // Проверка конкретных пар (a→b) требует history — это design-time / audit feature.
  // Тест проверяет доступное поведение: значение "cancelled" не упоминается
  // ни в одной паре → не в allowedSet → rejected.
  // --------------------------------------------------------------------------
  it("kind:transition — блокирует статус вне допустимого набора", async () => {
    const ontology = {
      entities: { Order: {} },
      invariants: [
        {
          name: "order_status_transition",
          kind: "transition",
          entity: "Order",
          field: "status",
          // allowedSet = {pending, confirmed, delivered}
          transitions: [
            ["pending", "confirmed"],
            ["confirmed", "delivered"],
          ],
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    // Создаём Order со статусом pending
    await validator.submit({
      id: "ef-order1", intent_id: "create_order", alpha: "add", target: "Order",
      status: "proposed", context: { id: "o1", status: "pending" },
      value: null, created_at: tick,
    });

    // Пробуем установить статус "cancelled" — его нет ни в одной паре transitions
    const result = await validator.submit({
      id: "ef-order2", intent_id: "cancel_order", alpha: "replace", target: "Order",
      status: "proposed", context: { id: "o1", status: "cancelled" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });

  it("kind:transition — разрешает допустимый переход", async () => {
    const ontology = {
      entities: { Order: {} },
      invariants: [
        {
          name: "order_status_transition",
          kind: "transition",
          entity: "Order",
          field: "status",
          transitions: [
            ["pending", "confirmed"],
            ["confirmed", "delivered"],
          ],
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    await validator.submit({
      id: "ef-order1", intent_id: "create_order", alpha: "add", target: "Order",
      status: "proposed", context: { id: "o1", status: "pending" },
      value: null, created_at: tick,
    });

    const result = await validator.submit({
      id: "ef-order2", intent_id: "confirm_order", alpha: "replace", target: "Order",
      status: "proposed", context: { id: "o1", status: "confirmed" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // cardinality: не более 1 активного Booking на пользователя
  // --------------------------------------------------------------------------
  it("kind:cardinality — блокирует дублирование при max:1", async () => {
    const ontology = {
      entities: { Booking: {} },
      invariants: [
        {
          name: "one_active_booking_per_user",
          kind: "cardinality",
          entity: "Booking",
          where: { status: "active" },
          groupBy: "userId",
          max: 1,
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    // Первое Booking — должно пройти
    await validator.submit({
      id: "ef-bk1", intent_id: "create_booking", alpha: "add", target: "Booking",
      status: "proposed", context: { id: "bk1", userId: "u1", status: "active" },
      value: null, created_at: tick,
    });

    // Второе Booking для того же userId — должно быть отклонено
    const result = await validator.submit({
      id: "ef-bk2", intent_id: "create_booking", alpha: "add", target: "Booking",
      status: "proposed", context: { id: "bk2", userId: "u1", status: "active" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });

  it("kind:cardinality — разрешает второй Booking другому userId", async () => {
    const ontology = {
      entities: { Booking: {} },
      invariants: [
        {
          name: "one_active_booking_per_user",
          kind: "cardinality",
          entity: "Booking",
          where: { status: "active" },
          groupBy: "userId",
          max: 1,
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    await validator.submit({
      id: "ef-bk1", intent_id: "create_booking", alpha: "add", target: "Booking",
      status: "proposed", context: { id: "bk1", userId: "u1", status: "active" },
      value: null, created_at: tick,
    });

    // Другой userId — не должно блокироваться
    const result = await validator.submit({
      id: "ef-bk2", intent_id: "create_booking", alpha: "add", target: "Booking",
      status: "proposed", context: { id: "bk2", userId: "u2", status: "active" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // aggregate: сумма позиций должна совпадать с totalValue портфеля
  //
  // Примечание: aggregate handler проверяется при каждом submit против
  // simulated world. Чтобы корректно проверить нарушение — сначала seed
  // корректного состояния (portfolio + position с совпадающей суммой),
  // затем replace position.value на несовпадающее → violation.
  // --------------------------------------------------------------------------
  it("kind:aggregate — нарушение при расхождении суммы с target", async () => {
    const ontology = {
      entities: { Portfolio: {}, Position: {} },
      invariants: [
        {
          name: "portfolio_value_sync",
          kind: "aggregate",
          op: "sum",
          from: "Position.value",
          where: { portfolioId: "$target.id" },
          target: "Portfolio.totalValue",
          tolerance: 0,
        },
      ],
    };
    // Seed: portfolio totalValue=100, position value=100 (сумма сходится)
    const seed = [
      {
        id: "seed-port", intent_id: "create_portfolio", alpha: "add", target: "Portfolio",
        context: { id: "pf1", totalValue: 100 }, value: null, created_at: 500,
      },
      {
        id: "seed-pos", intent_id: "create_position", alpha: "add", target: "Position",
        context: { id: "pos1", portfolioId: "pf1", value: 100 }, value: null, created_at: 501,
      },
    ];
    const { validator } = await mkValidator(ontology, seed, { clock });

    // Replace position value → 50: sum(50) ≠ totalValue(100) → нарушение
    const result = await validator.submit({
      id: "ef-update", intent_id: "update_position", alpha: "replace", target: "Position",
      status: "proposed", context: { id: "pos1", portfolioId: "pf1", value: 50 },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });

  it("kind:aggregate — ok когда сумма совпадает после replace (tolerance=0)", async () => {
    const ontology = {
      entities: { Portfolio: {}, Position: {} },
      invariants: [
        {
          name: "portfolio_value_sync",
          kind: "aggregate",
          op: "sum",
          from: "Position.value",
          where: { portfolioId: "$target.id" },
          target: "Portfolio.totalValue",
          tolerance: 0,
        },
      ],
    };
    // Seed: portfolio totalValue=100, position value=100 (сходится)
    const seed = [
      {
        id: "seed-port2", intent_id: "create_portfolio", alpha: "add", target: "Portfolio",
        context: { id: "pf2", totalValue: 100 }, value: null, created_at: 500,
      },
      {
        id: "seed-pos2", intent_id: "create_position", alpha: "add", target: "Position",
        context: { id: "pos2", portfolioId: "pf2", value: 80 }, value: null, created_at: 501,
      },
    ];
    const { validator } = await mkValidator(ontology, seed, { clock });

    // Replace position value → 100: sum(100) === totalValue(100) → ok
    const result = await validator.submit({
      id: "ef-update2", intent_id: "update_position", alpha: "replace", target: "Position",
      status: "proposed", context: { id: "pos2", portfolioId: "pf2", value: 100 },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // expression: row-level predicate
  // --------------------------------------------------------------------------
  it("kind:expression — блокирует нарушение predicate (отрицательный amount)", async () => {
    const ontology = {
      entities: { Transaction: {} },
      invariants: [
        {
          name: "positive_amount",
          kind: "expression",
          entity: "Transaction",
          // expression — строка (не predicate: строка); handler создаёт Function
          expression: "amount > 0",
          message: "amount must be positive",
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    const result = await validator.submit({
      id: "ef-tx1", intent_id: "create_tx", alpha: "add", target: "Transaction",
      status: "proposed", context: { id: "tx1", amount: -100 },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });

  it("kind:expression — ok при соблюдении predicate", async () => {
    const ontology = {
      entities: { Transaction: {} },
      invariants: [
        {
          name: "positive_amount",
          kind: "expression",
          entity: "Transaction",
          expression: "amount > 0",
          message: "amount must be positive",
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    const result = await validator.submit({
      id: "ef-tx2", intent_id: "create_tx", alpha: "add", target: "Transaction",
      status: "proposed", context: { id: "tx2", amount: 250 },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("confirmed");
  });

  it("kind:expression — predicate как функция (function-form)", async () => {
    const ontology = {
      entities: { Deal: {} },
      invariants: [
        {
          name: "no_self_deal",
          kind: "expression",
          entity: "Deal",
          predicate: (row) => row.customerId !== row.executorId,
          message: "customerId !== executorId",
        },
      ],
    };
    const p = createInMemoryPersistence({ clock });
    const validator = createValidator({ persistence: p, ontology, clock });

    // Самосделка — нарушение
    const result = await validator.submit({
      id: "ef-deal1", intent_id: "create_deal", alpha: "add", target: "Deal",
      status: "proposed", context: { id: "d1", customerId: "u1", executorId: "u1" },
      value: null, created_at: tick,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/invariant/i);
  });
});
