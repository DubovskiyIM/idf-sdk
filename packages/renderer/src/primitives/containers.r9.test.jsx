import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { List } from "./containers.jsx";

function renderItems(node, ctx) {
  const utils = render(<List node={node} ctx={ctx} />);
  return utils;
}

describe("List primitive — R9 composition auto-enrich", () => {
  afterEach(() => cleanup());

  const world = {
    deals: [
      { id: "d1", amount: 5000, taskId: "t1", customerId: "u1" },
      { id: "d2", amount: 3000, taskId: "t2", customerId: "u2" },
    ],
    Task: [
      { id: "t1", title: "Логотип" },
      { id: "t2", title: "API" },
    ],
    User: [
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ],
  };

  it("обогащает items через artifact.compositions перед filter", () => {
    const node = {
      type: "list",
      source: "deals",
      // Фильтруем через aliased path — работает только после R9-enrichment
      filter: "item.customer && item.customer.name === 'Alice'",
      item: { type: "text", bind: "id" },
    };
    const ctx = {
      world,
      viewer: {},
      artifact: {
        compositions: [
          { entity: "Task", as: "task",     via: "taskId",     mode: "one" },
          { entity: "User", as: "customer", via: "customerId", mode: "one" },
        ],
      },
    };
    const { container } = renderItems(node, ctx);
    // После фильтра должен остаться только d1 (customer.name === Alice)
    expect(container.textContent).toContain("d1");
    expect(container.textContent).not.toContain("d2");
  });

  it("без compositions — поведение не меняется (backward compat)", () => {
    const node = {
      type: "list",
      source: "deals",
      item: { type: "text", bind: "id" },
    };
    const ctx = {
      world,
      viewer: {},
      artifact: {},  // no compositions
    };
    const { container } = renderItems(node, ctx);
    expect(container.textContent).toContain("d1");
    expect(container.textContent).toContain("d2");
  });

  it("пустые items — не падает при наличии compositions", () => {
    const node = {
      type: "list",
      source: "empty_collection",
      item: { type: "text", bind: "id" },
    };
    const ctx = {
      world: { empty_collection: [] },
      viewer: {},
      artifact: {
        compositions: [{ entity: "Task", as: "task", via: "taskId", mode: "one" }],
      },
    };
    expect(() => renderItems(node, ctx)).not.toThrow();
  });
});
