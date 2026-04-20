// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

// Крохотный item-шаблон: выводит id записи текстом, чтобы можно было
// проверять через container.textContent какие элементы прошли фильтр.
const ITEM = {
  type: "text",
  bind: "id",
  style: { fontSize: 12 },
};

describe("List — legacy string filter (back-compat)", () => {
  it("string expression продолжает работать", () => {
    const node = {
      type: "list",
      source: "tasks",
      filter: "status === 'active'",
      item: ITEM,
    };
    const ctx = {
      world: { tasks: [
        { id: "t1", status: "active" },
        { id: "t2", status: "done" },
      ] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("t1");
    expect(container.textContent).not.toContain("t2");
  });
});

describe("List — simple structured filter (R3b / R11 v2)", () => {
  it("{ field, op, value: 'me.id' } фильтрует по viewer.id", () => {
    const node = {
      type: "list",
      source: "insights",
      filter: { field: "userId", op: "=", value: "me.id" },
      item: ITEM,
    };
    const ctx = {
      world: { insights: [
        { id: "i1", userId: "u1" },
        { id: "i2", userId: "u2" },
        { id: "i3", userId: "u1" },
      ] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("i1");
    expect(container.textContent).toContain("i3");
    expect(container.textContent).not.toContain("i2");
  });

  it("{ field, op:'!=', value }", () => {
    const node = {
      type: "list",
      source: "items",
      filter: { field: "status", op: "!=", value: "archived" },
      item: ITEM,
    };
    const ctx = {
      world: { items: [
        { id: "a", status: "open" },
        { id: "b", status: "archived" },
      ] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("a");
    expect(container.textContent).not.toContain("b");
  });
});

describe("List — disjunction filter (R7b multi-owner)", () => {
  it("{ kind:'disjunction', fields:['customerId','executorId'] } — OR", () => {
    const node = {
      type: "list",
      source: "deals",
      filter: {
        kind: "disjunction",
        fields: ["customerId", "executorId"],
        op: "=",
        value: "me.id",
      },
      item: ITEM,
    };
    const ctx = {
      world: { deals: [
        { id: "d1", customerId: "u1", executorId: "u2" }, // видит как клиент
        { id: "d2", customerId: "u2", executorId: "u1" }, // видит как исполнитель
        { id: "d3", customerId: "u2", executorId: "u3" }, // не участник
      ] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("d1");
    expect(container.textContent).toContain("d2");
    expect(container.textContent).not.toContain("d3");
  });
});

describe("List — m2m-via filter (R10 role scope)", () => {
  it("bridge-коллекция разрешает доступ к localField-записям", () => {
    const node = {
      type: "list",
      source: "portfolios",
      filter: {
        kind: "m2m-via",
        via: "assignments",
        viewerField: "advisorId",
        joinField: "clientId",
        localField: "userId",
        statusField: "status",
        statusAllowed: ["active"],
      },
      item: ITEM,
    };
    const ctx = {
      world: {
        portfolios: [
          { id: "p1", userId: "c1" }, // advisor видит (active assignment)
          { id: "p2", userId: "c2" }, // advisor НЕ видит (inactive assignment)
          { id: "p3", userId: "c3" }, // чужой клиент
        ],
        assignments: [
          { advisorId: "u1", clientId: "c1", status: "active" },
          { advisorId: "u1", clientId: "c2", status: "inactive" },
          { advisorId: "u99", clientId: "c3", status: "active" },
        ],
      },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("p1");
    expect(container.textContent).not.toContain("p2");
    expect(container.textContent).not.toContain("p3");
  });
});

describe("List — sort работает после structured-filter", () => {
  it("descending сортировка по createdAt поверх disjunction", () => {
    const node = {
      type: "list",
      source: "items",
      filter: { field: "userId", op: "=", value: "me.id" },
      sort: "-createdAt",
      item: {
        type: "text",
        bind: "id",
      },
    };
    const ctx = {
      world: { items: [
        { id: "a", userId: "u1", createdAt: 100 },
        { id: "c", userId: "u1", createdAt: 300 },
        { id: "b", userId: "u1", createdAt: 200 },
        { id: "x", userId: "u2", createdAt: 999 },
      ] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    // Все три u1-записи — в порядке c,b,a (newest first)
    const text = container.textContent;
    expect(text).not.toContain("x");
    const posC = text.indexOf("c");
    const posB = text.indexOf("b");
    const posA = text.indexOf("a");
    expect(posC).toBeLessThan(posB);
    expect(posB).toBeLessThan(posA);
  });
});
