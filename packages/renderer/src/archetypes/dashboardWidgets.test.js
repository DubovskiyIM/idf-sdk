import { describe, it, expect } from "vitest";
import {
  toCollection,
  splitArgs,
  parseAggregate,
  resolveRhs,
  matchFilter,
  evalAggregate,
  formatScalar,
  sortItems,
} from "./dashboardWidgets.js";

describe("toCollection — pluralization", () => {
  it("обычное → +s (lowerCamel)", () => {
    expect(toCollection("Order")).toBe("orders");
    expect(toCollection("User")).toBe("users");
  });
  it("оканчивается на 's' → +es", () => {
    expect(toCollection("Address")).toBe("addresses");
    expect(toCollection("Status")).toBe("statuses");
  });
  it("оканчивается на 'y' → -y +ies", () => {
    expect(toCollection("Category")).toBe("categories");
    expect(toCollection("Hypothesis")).toBe("hypothesises");
  });
  it("null/empty → null", () => {
    expect(toCollection(null)).toBeNull();
    expect(toCollection("")).toBeNull();
  });
});

describe("splitArgs — разделитель и trim", () => {
  it("делит по запятым с trim'ом", () => {
    expect(splitArgs("a, b ,  c")).toEqual(["a", "b", "c"]);
  });
  it("выбрасывает пустые", () => {
    expect(splitArgs("a,, b, ")).toEqual(["a", "b"]);
  });
});

describe("parseAggregate — DSL", () => {
  it("count(collection) — без поля и фильтров", () => {
    expect(parseAggregate("count(orders)"))
      .toEqual({ op: "count", collection: "orders", field: null, filters: [] });
  });
  it("count(collection, filter)", () => {
    expect(parseAggregate("count(orders, status=completed)"))
      .toEqual({ op: "count", collection: "orders", field: null, filters: ["status=completed"] });
  });
  it("sum(collection, field, filters...)", () => {
    expect(parseAggregate("sum(orders, total, status=completed, paid=true)"))
      .toEqual({ op: "sum", collection: "orders", field: "total", filters: ["status=completed", "paid=true"] });
  });
  it("avg(...) с верхним регистром тоже принимается", () => {
    expect(parseAggregate("AVG(rates, value)"))
      .toEqual({ op: "avg", collection: "rates", field: "value", filters: [] });
  });
  it("невалидное → null", () => {
    expect(parseAggregate("foo(bar)")).toBeNull();
    expect(parseAggregate("")).toBeNull();
    expect(parseAggregate(null)).toBeNull();
  });
});

describe("resolveRhs — типы значений", () => {
  it("числовые литералы", () => {
    expect(resolveRhs("42")).toBe(42);
    expect(resolveRhs("-3.14")).toBe(-3.14);
  });
  it("булевы и null", () => {
    expect(resolveRhs("true")).toBe(true);
    expect(resolveRhs("false")).toBe(false);
    expect(resolveRhs("null")).toBeNull();
  });
  it("строки в кавычках обоих видов", () => {
    expect(resolveRhs("'pending'")).toBe("pending");
    expect(resolveRhs('"done"')).toBe("done");
  });
  it("viewer-путь резолвится", () => {
    expect(resolveRhs("viewer.id", { id: "u1" })).toBe("u1");
    expect(resolveRhs("viewer.role", { role: "admin" })).toBe("admin");
  });
  it("today/now — корректные timestamps", () => {
    const before = Date.now();
    const today = resolveRhs("today");
    const now = resolveRhs("now");
    const after = Date.now();
    expect(today).toBeLessThanOrEqual(before);
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
  it("bare-токен возвращается как строка (для статусов без кавычек)", () => {
    expect(resolveRhs("completed")).toBe("completed");
  });
});

describe("matchFilter — операторы сравнения", () => {
  const row = { status: "done", total: 100, userId: "u1" };
  it("= и !=", () => {
    expect(matchFilter(row, "status=done")).toBe(true);
    expect(matchFilter(row, "status=pending")).toBe(false);
    expect(matchFilter(row, "status!=pending")).toBe(true);
    expect(matchFilter(row, "status!=done")).toBe(false);
  });
  it(">, <, >=, <=", () => {
    expect(matchFilter(row, "total>50")).toBe(true);
    expect(matchFilter(row, "total>100")).toBe(false);
    expect(matchFilter(row, "total>=100")).toBe(true);
    expect(matchFilter(row, "total<=99")).toBe(false);
    expect(matchFilter(row, "total<200")).toBe(true);
  });
  it("viewer-путь в правой части", () => {
    expect(matchFilter(row, "userId=viewer.id", { id: "u1" })).toBe(true);
    expect(matchFilter(row, "userId=viewer.id", { id: "u2" })).toBe(false);
  });
  it("невалидное выражение → true (пропуск, не блокирует)", () => {
    expect(matchFilter(row, "garbage no operator")).toBe(true);
  });
});

describe("evalAggregate — count/sum/avg", () => {
  const world = {
    orders: [
      { id: "o1", status: "completed", total: 100, userId: "u1" },
      { id: "o2", status: "completed", total: 200, userId: "u2" },
      { id: "o3", status: "pending",   total: 50,  userId: "u1" },
      { id: "o4", status: "completed", total: 300, userId: "u1" },
    ],
  };
  it("count без фильтров", () => {
    const spec = parseAggregate("count(orders)");
    expect(evalAggregate(spec, { world })).toBe(4);
  });
  it("count с фильтром", () => {
    const spec = parseAggregate("count(orders, status=completed)");
    expect(evalAggregate(spec, { world })).toBe(3);
  });
  it("sum по filtered", () => {
    const spec = parseAggregate("sum(orders, total, status=completed)");
    expect(evalAggregate(spec, { world })).toBe(600);
  });
  it("avg по filtered", () => {
    const spec = parseAggregate("avg(orders, total, status=completed)");
    expect(evalAggregate(spec, { world })).toBe(200);
  });
  it("avg на пустом наборе → 0", () => {
    const spec = parseAggregate("avg(orders, total, status=missing)");
    expect(evalAggregate(spec, { world })).toBe(0);
  });
  it("sum с viewer-фильтром", () => {
    const spec = parseAggregate("sum(orders, total, userId=viewer.id)");
    expect(evalAggregate(spec, { world, viewer: { id: "u1" } })).toBe(450);
  });
  it("отсутствующая коллекция → 0 / null безопасно", () => {
    const spec = parseAggregate("count(missing)");
    expect(evalAggregate(spec, { world })).toBe(0);
  });
  it("null spec → null", () => {
    expect(evalAggregate(null, { world })).toBeNull();
  });
});

describe("formatScalar — представление чисел", () => {
  it("null/undefined → '—'", () => {
    expect(formatScalar(null)).toBe("—");
    expect(formatScalar(undefined)).toBe("—");
  });
  it("integer → ru-RU локаль", () => {
    expect(formatScalar(1234567)).toBe("1\u00A0234\u00A0567");
  });
  it("float → toFixed(2)", () => {
    expect(formatScalar(3.14159)).toBe("3.14");
  });
  it("rating field → toFixed(2) даже если integer", () => {
    expect(formatScalar(5, "rating")).toBe("5.00");
  });
  it("Infinity / NaN → '—'", () => {
    expect(formatScalar(Infinity)).toBe("—");
    expect(formatScalar(NaN)).toBe("—");
  });
  it("non-number → String()", () => {
    expect(formatScalar("hello")).toBe("hello");
  });
});

describe("sortItems — направление и null-обработка", () => {
  const items = [
    { id: 1, name: "B", score: 20 },
    { id: 2, name: "A", score: 10 },
    { id: 3, name: "C", score: null },
  ];
  it("asc по умолчанию", () => {
    expect(sortItems(items, "name").map(i => i.id)).toEqual([2, 1, 3]);
  });
  it("desc явно", () => {
    expect(sortItems(items, "score:desc").map(i => i.id)).toEqual([1, 2, 3]);
  });
  it("null уходит в конец независимо от direction", () => {
    const ascByScore = sortItems(items, "score:asc");
    expect(ascByScore[ascByScore.length - 1].score).toBeNull();
  });
  it("исходный массив не мутируется", () => {
    const before = items.map(i => i.id);
    sortItems(items, "name");
    expect(items.map(i => i.id)).toEqual(before);
  });
});
