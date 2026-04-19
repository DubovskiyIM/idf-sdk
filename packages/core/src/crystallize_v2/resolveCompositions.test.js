import { describe, it, expect } from "vitest";
import {
  resolveCompositions,
  resolveItemCompositions,
  getAliasedField,
} from "./resolveCompositions.js";

describe("resolveItemCompositions — one-mode", () => {
  const world = {
    Task: [
      { id: "t1", title: "Логотип", category: "design" },
      { id: "t2", title: "API",     category: "backend" },
    ],
    User: [
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ],
  };

  it("обогащает item alias-полями one-mode", () => {
    const item = { id: "d1", amount: 5000, taskId: "t1", customerId: "u1" };
    const compositions = [
      { entity: "Task", as: "task",     via: "taskId",     mode: "one" },
      { entity: "User", as: "customer", via: "customerId", mode: "one" },
    ];
    const enriched = resolveItemCompositions(item, compositions, world);

    expect(enriched.task).toEqual({ id: "t1", title: "Логотип", category: "design" });
    expect(enriched.customer).toEqual({ id: "u1", name: "Alice" });
    expect(enriched.amount).toBe(5000);
  });

  it("не мутирует исходный item", () => {
    const item = { id: "d1", taskId: "t1" };
    const compositions = [{ entity: "Task", as: "task", via: "taskId", mode: "one" }];
    const enriched = resolveItemCompositions(item, compositions, world);

    expect(item.task).toBeUndefined();
    expect(enriched).not.toBe(item);
  });

  it("null на missing reference", () => {
    const item = { id: "d1", taskId: "t999" };
    const compositions = [{ entity: "Task", as: "task", via: "taskId", mode: "one" }];
    const enriched = resolveItemCompositions(item, compositions, world);
    expect(enriched.task).toBeNull();
  });

  it("null на missing fk value", () => {
    const item = { id: "d1" };
    const compositions = [{ entity: "Task", as: "task", via: "taskId", mode: "one" }];
    const enriched = resolveItemCompositions(item, compositions, world);
    expect(enriched.task).toBeNull();
  });

  it("mode по умолчанию — one", () => {
    const item = { id: "d1", taskId: "t2" };
    const compositions = [{ entity: "Task", as: "task", via: "taskId" }];  // no mode
    const enriched = resolveItemCompositions(item, compositions, world);
    expect(enriched.task.title).toBe("API");
  });
});

describe("resolveItemCompositions — many-mode", () => {
  const world = {
    OrderItem: [
      { id: "oi1", orderId: "o1", name: "Pizza", qty: 2 },
      { id: "oi2", orderId: "o1", name: "Coke",  qty: 1 },
      { id: "oi3", orderId: "o2", name: "Salad", qty: 1 },
    ],
    Bid: [
      { id: "b1", listingId: "l1", amount: 100 },
      { id: "b2", listingId: "l1", amount: 150 },
    ],
  };

  it("собирает список child'ов по parent.id === child[via]", () => {
    const parent = { id: "o1", status: "new" };
    const compositions = [{ entity: "OrderItem", as: "items", via: "orderId", mode: "many" }];
    const enriched = resolveItemCompositions(parent, compositions, world);

    expect(enriched.items.length).toBe(2);
    expect(enriched.items.map(i => i.name)).toEqual(["Pizza", "Coke"]);
  });

  it("пустой массив если нет child'ов", () => {
    const parent = { id: "o999" };
    const compositions = [{ entity: "OrderItem", as: "items", via: "orderId", mode: "many" }];
    const enriched = resolveItemCompositions(parent, compositions, world);
    expect(enriched.items).toEqual([]);
  });

  it("missing entity в world — empty array для many", () => {
    const parent = { id: "l1" };
    const compositions = [{ entity: "NonExistent", as: "items", via: "foo", mode: "many" }];
    const enriched = resolveItemCompositions(parent, compositions, {});
    expect(enriched.items).toEqual([]);
  });
});

describe("resolveCompositions — batch", () => {
  const world = {
    User: [{ id: "u1", name: "A" }, { id: "u2", name: "B" }],
  };
  const compositions = [{ entity: "User", as: "user", via: "userId", mode: "one" }];

  it("обогащает массив items", () => {
    const items = [
      { id: "x1", userId: "u1" },
      { id: "x2", userId: "u2" },
      { id: "x3", userId: "u1" },
    ];
    const result = resolveCompositions(items, compositions, world);

    expect(result.length).toBe(3);
    expect(result[0].user.name).toBe("A");
    expect(result[1].user.name).toBe("B");
    expect(result[2].user.name).toBe("A");
  });

  it("pass-through при пустом compositions", () => {
    const items = [{ id: "x1" }];
    const result = resolveCompositions(items, [], world);
    expect(result).toEqual(items);
    expect(result).not.toBe(items);  // новый массив
  });

  it("non-array items returned as-is", () => {
    expect(resolveCompositions(null, compositions, world)).toBeNull();
    expect(resolveCompositions("foo", compositions, world)).toBe("foo");
  });
});

describe("getAliasedField", () => {
  const enriched = {
    id: "d1",
    amount: 5000,
    task:     { id: "t1", title: "Логотип" },
    customer: { id: "u1", name: "Alice", address: { city: "Moscow" } },
  };

  it("возвращает поле по aliased path", () => {
    expect(getAliasedField(enriched, "task.title")).toBe("Логотип");
    expect(getAliasedField(enriched, "customer.name")).toBe("Alice");
  });

  it("один уровень — плоское поле", () => {
    expect(getAliasedField(enriched, "amount")).toBe(5000);
  });

  it("multi-level nested", () => {
    expect(getAliasedField(enriched, "customer.address.city")).toBe("Moscow");
  });

  it("undefined на отсутствующий алиас", () => {
    expect(getAliasedField(enriched, "missing.field")).toBeUndefined();
    expect(getAliasedField(enriched, "task.nonexistent")).toBeUndefined();
  });

  it("undefined при null item", () => {
    expect(getAliasedField(null, "foo")).toBeUndefined();
  });
});
