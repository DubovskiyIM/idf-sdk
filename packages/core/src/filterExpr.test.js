import { describe, it, expect } from "vitest";
import { evalFilter } from "./filterExpr.js";

const viewer = { id: "u1", role: "customer" };

describe("evalFilter — null/undefined", () => {
  it("null filter → true (row passes)", () => {
    expect(evalFilter(null, { id: "a" }, { viewer })).toBe(true);
  });
  it("undefined filter → true", () => {
    expect(evalFilter(undefined, { id: "a" }, { viewer })).toBe(true);
  });
});

describe("evalFilter — string (legacy JS expression)", () => {
  it("simple expression matches field", () => {
    expect(evalFilter("status === 'active'", { status: "active" }, { viewer })).toBe(true);
    expect(evalFilter("status === 'active'", { status: "done" }, { viewer })).toBe(false);
  });
  it("viewer reference works", () => {
    expect(evalFilter("userId === viewer.id", { userId: "u1" }, { viewer })).toBe(true);
    expect(evalFilter("userId === viewer.id", { userId: "u2" }, { viewer })).toBe(false);
  });
  it("broken expression → permissive true (fallback)", () => {
    expect(evalFilter("this is not JS", { id: "a" }, { viewer })).toBe(true);
  });
});

describe("evalFilter — simple { field, op, value } (R3b / R11 v2)", () => {
  it("op '=' matches", () => {
    const filter = { field: "userId", op: "=", value: "u1" };
    expect(evalFilter(filter, { userId: "u1" }, { viewer })).toBe(true);
    expect(evalFilter(filter, { userId: "u2" }, { viewer })).toBe(false);
  });
  it('value "me.id" резолвится через viewer.id', () => {
    const filter = { field: "userId", op: "=", value: "me.id" };
    expect(evalFilter(filter, { userId: "u1" }, { viewer })).toBe(true);
    expect(evalFilter(filter, { userId: "u2" }, { viewer })).toBe(false);
  });
  it("op '!=' работает", () => {
    const filter = { field: "status", op: "!=", value: "archived" };
    expect(evalFilter(filter, { status: "active" }, { viewer })).toBe(true);
    expect(evalFilter(filter, { status: "archived" }, { viewer })).toBe(false);
  });
  it("op '>' / '<' для чисел", () => {
    expect(evalFilter({ field: "amount", op: ">", value: 100 }, { amount: 150 }, { viewer })).toBe(true);
    expect(evalFilter({ field: "amount", op: ">", value: 100 }, { amount: 50 }, { viewer })).toBe(false);
    expect(evalFilter({ field: "amount", op: "<", value: 100 }, { amount: 50 }, { viewer })).toBe(true);
  });
  it("op 'in' для массива значений", () => {
    const filter = { field: "status", op: "in", value: ["active", "pending"] };
    expect(evalFilter(filter, { status: "active" }, { viewer })).toBe(true);
    expect(evalFilter(filter, { status: "done" }, { viewer })).toBe(false);
  });
});

describe("evalFilter — { kind: 'disjunction' } (R7b multi-owner)", () => {
  const filter = {
    kind: "disjunction",
    fields: ["customerId", "executorId"],
    op: "=",
    value: "me.id",
  };

  it("matches когда customerId совпадает", () => {
    expect(evalFilter(filter, { customerId: "u1", executorId: "u2" }, { viewer })).toBe(true);
  });
  it("matches когда executorId совпадает", () => {
    expect(evalFilter(filter, { customerId: "u2", executorId: "u1" }, { viewer })).toBe(true);
  });
  it("не matches когда ни одно не совпадает", () => {
    expect(evalFilter(filter, { customerId: "u3", executorId: "u2" }, { viewer })).toBe(false);
  });
  it("пустой fields → false", () => {
    const empty = { kind: "disjunction", fields: [], op: "=", value: "me.id" };
    expect(evalFilter(empty, { customerId: "u1" }, { viewer })).toBe(false);
  });
});

describe("evalFilter — { kind: 'm2m-via' } (R10 role scope)", () => {
  const world = {
    assignments: [
      { advisorId: "u1", clientId: "c1", status: "active" },
      { advisorId: "u1", clientId: "c2", status: "active" },
      { advisorId: "u1", clientId: "c3", status: "inactive" },
      { advisorId: "u2", clientId: "c4", status: "active" },
    ],
  };

  it("matches row.localField ∈ (joinField set from bridge)", () => {
    const filter = {
      kind: "m2m-via",
      via: "assignments",
      viewerField: "advisorId",
      joinField: "clientId",
      localField: "userId",
    };
    expect(evalFilter(filter, { userId: "c1" }, { viewer, world })).toBe(true);
    expect(evalFilter(filter, { userId: "c2" }, { viewer, world })).toBe(true);
    expect(evalFilter(filter, { userId: "c3" }, { viewer, world })).toBe(true);
    expect(evalFilter(filter, { userId: "c4" }, { viewer, world })).toBe(false);
  });

  it("statusField + statusAllowed фильтрует мост", () => {
    const filter = {
      kind: "m2m-via",
      via: "assignments",
      viewerField: "advisorId",
      joinField: "clientId",
      localField: "userId",
      statusField: "status",
      statusAllowed: ["active"],
    };
    expect(evalFilter(filter, { userId: "c1" }, { viewer, world })).toBe(true);
    expect(evalFilter(filter, { userId: "c3" }, { viewer, world })).toBe(false);
  });

  it("world отсутствует → false (защитно)", () => {
    const filter = {
      kind: "m2m-via",
      via: "assignments",
      viewerField: "advisorId",
      joinField: "clientId",
      localField: "userId",
    };
    expect(evalFilter(filter, { userId: "c1" }, { viewer })).toBe(false);
  });

  it("bridge-коллекция пустая/отсутствует → false", () => {
    const filter = {
      kind: "m2m-via",
      via: "unknown",
      viewerField: "a",
      joinField: "b",
      localField: "c",
    };
    expect(evalFilter(filter, { c: "x" }, { viewer, world })).toBe(false);
  });
});

describe("evalFilter — без viewer (server-less context)", () => {
  it('value "me.id" без viewer → false (не резолвится)', () => {
    const filter = { field: "userId", op: "=", value: "me.id" };
    expect(evalFilter(filter, { userId: "u1" }, {})).toBe(false);
  });
});
