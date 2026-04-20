// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

const world = {
  tasks: [
    { id: "t1", title: "DraftItem", status: "draft" },
    { id: "t2", title: "PubItemA", status: "published" },
    { id: "t3", title: "PubItemB", status: "published" },
    { id: "t4", title: "ClosedItem", status: "closed" },
  ],
};

const baseCtx = {
  world,
  viewer: { id: "u1" },
  viewState: {},
};

function mkNode(extra = {}) {
  return {
    type: "list",
    source: "tasks",
    item: { type: "text", bind: "title" },
    ...extra,
  };
}

describe("List + projection.tabs (UI-gap #1)", () => {
  it("без tabs — рендерит все items без tab-bar", () => {
    const { container, getByText } = render(
      <List node={mkNode()} ctx={baseCtx} />,
    );
    expect(container.querySelector("[role='tablist']")).toBeNull();
    expect(getByText("DraftItem")).toBeTruthy();
    expect(getByText("PubItemA")).toBeTruthy();
  });

  it("с tabs — рендерит tab-bar с buttons role='tab'", () => {
    const node = mkNode({
      tabs: [
        { id: "new", label: "+ Новое", filter: "item.status === 'draft'" },
        { id: "open", label: "Открытые", filter: "item.status === 'published'" },
      ],
    });
    const { getAllByRole } = render(<List node={node} ctx={baseCtx} />);
    const tabs = getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toBe("+ Новое");
    expect(tabs[1].textContent).toBe("Открытые");
  });

  it("active tab: первый по умолчанию, items фильтруются по его filter", () => {
    const node = mkNode({
      tabs: [
        { id: "new", label: "Draft", filter: "item.status === 'draft'" },
        { id: "open", label: "Published", filter: "item.status === 'published'" },
      ],
    });
    const { getAllByRole, queryByText } = render(<List node={node} ctx={baseCtx} />);
    expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
    expect(queryByText("DraftItem")).toBeTruthy();
    expect(queryByText("PubItemA")).toBeNull();
    expect(queryByText("ClosedItem")).toBeNull();
  });

  it("defaultTab управляет начальным активным табом", () => {
    const node = mkNode({
      tabs: [
        { id: "new", label: "Draft", filter: "item.status === 'draft'" },
        { id: "open", label: "Published", filter: "item.status === 'published'" },
      ],
      defaultTab: "open",
    });
    const { queryByText, getAllByRole } = render(<List node={node} ctx={baseCtx} />);
    const tabs = getAllByRole("tab");
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(queryByText("DraftItem")).toBeNull();
    expect(queryByText("PubItemA")).toBeTruthy();
    expect(queryByText("PubItemB")).toBeTruthy();
  });

  it("click на tab переключает активный + пересортирует items", () => {
    const node = mkNode({
      tabs: [
        { id: "new", label: "Draft", filter: "item.status === 'draft'" },
        { id: "open", label: "Published", filter: "item.status === 'published'" },
      ],
    });
    const { getAllByRole, queryByText } = render(<List node={node} ctx={baseCtx} />);
    expect(queryByText("DraftItem")).toBeTruthy();
    fireEvent.click(getAllByRole("tab")[1]);
    expect(queryByText("DraftItem")).toBeNull();
    expect(queryByText("PubItemA")).toBeTruthy();
  });

  it("base filter + tab filter: композиция (AND)", () => {
    const node = mkNode({
      filter: "item.status !== 'closed'",  // базовый — исключаем closed
      tabs: [
        { id: "all-open", label: "Open", filter: "item.status === 'published'" },
      ],
    });
    const { queryByText } = render(<List node={node} ctx={baseCtx} />);
    expect(queryByText("ClosedItem")).toBeNull();  // исключён base-filter'ом
    expect(queryByText("DraftItem")).toBeNull();  // не published
    expect(queryByText("PubItemA")).toBeTruthy();
  });
});
