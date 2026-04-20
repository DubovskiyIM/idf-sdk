// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

const world = {
  orders: [
    { id: "o1", title: "Task A", status: "draft" },
    { id: "o2", title: "Task B", status: "active" },
    { id: "o3", title: "Task C", status: "active" },
    { id: "o4", title: "Task D", status: "done" },
  ],
};

const ctx = { world, viewer: { id: "u1" } };

const layout = {
  type: "kanban",
  columnField: "status",
  columns: [
    { id: "draft", label: "Черновик" },
    { id: "active", label: "Активные" },
    { id: "done", label: "Готово" },
  ],
};

const node = {
  type: "list",
  source: "orders",
  item: { type: "text", bind: "title" },
  layout,
};

describe("List kanban layout (UI-gap — pattern apply)", () => {
  it("рендерит горизонтальные колонки по columns list", () => {
    const { container } = render(<List node={node} ctx={ctx} />);
    const columnEls = container.querySelectorAll("[data-column]");
    expect(columnEls).toHaveLength(3);
    expect(columnEls[0].getAttribute("data-column")).toBe("draft");
  });

  it("группирует items по columnField value", () => {
    const { container, getAllByText } = render(<List node={node} ctx={ctx} />);
    // Active column должен содержать 2 task'а (B и C)
    const activeColumn = container.querySelector("[data-column='active']");
    expect(activeColumn.textContent).toContain("Task B");
    expect(activeColumn.textContent).toContain("Task C");
    expect(activeColumn.textContent).not.toContain("Task A");
  });

  it("column label отображается", () => {
    const { getByText } = render(<List node={node} ctx={ctx} />);
    expect(getByText("Черновик")).toBeTruthy();
    expect(getByText("Активные")).toBeTruthy();
  });

  it("счётчик items показывается для каждой колонки", () => {
    const { container } = render(<List node={node} ctx={ctx} />);
    const draftCol = container.querySelector("[data-column='draft']");
    const activeCol = container.querySelector("[data-column='active']");
    expect(draftCol.textContent).toContain("1");
    expect(activeCol.textContent).toContain("2");
  });

  it("unmatched items попадают в последнюю колонку", () => {
    const extraWorld = {
      orders: [
        ...world.orders,
        { id: "o5", title: "Orphan", status: "unknown" },
      ],
    };
    const { container } = render(<List node={node} ctx={{ ...ctx, world: extraWorld }} />);
    const lastCol = container.querySelector("[data-column='done']");
    expect(lastCol.textContent).toContain("Orphan");
  });

  it("aria-label='Kanban'", () => {
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.querySelector("[role='group']")?.getAttribute("aria-label")).toBe("Kanban");
  });
});
