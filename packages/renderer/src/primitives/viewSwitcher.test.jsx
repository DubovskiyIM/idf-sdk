// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { ViewSwitcher } from "./viewSwitcher.jsx";

afterEach(cleanup);

const views = [
  { id: "board", name: "Доска", archetype: "catalog" },
  { id: "table", name: "Таблица", archetype: "catalog" },
];

describe("ViewSwitcher", () => {
  it("renders all view names", () => {
    const { getByText } = render(<ViewSwitcher views={views} activeId="board" onChange={() => {}} />);
    expect(getByText("Доска")).toBeTruthy();
    expect(getByText("Таблица")).toBeTruthy();
  });

  it("highlights active view via data-active", () => {
    const { getByText } = render(<ViewSwitcher views={views} activeId="table" onChange={() => {}} />);
    const active = getByText("Таблица");
    expect(active.getAttribute("data-active")).toBe("true");
  });

  it("calls onChange with view id on click", () => {
    let called = null;
    const { getByText } = render(
      <ViewSwitcher views={views} activeId="board" onChange={(id) => { called = id; }} />
    );
    fireEvent.click(getByText("Таблица"));
    expect(called).toBe("table");
  });

  it("renders dropdown variant for 4+ views", () => {
    const many = [
      { id: "a", name: "A" }, { id: "b", name: "B" },
      { id: "c", name: "C" }, { id: "d", name: "D" },
    ];
    const { container } = render(<ViewSwitcher views={many} activeId="a" onChange={() => {}} />);
    expect(container.querySelector("select")).toBeTruthy();
  });

  it("renders null for empty or single-view", () => {
    const { container: c1 } = render(<ViewSwitcher views={[]} activeId={null} onChange={() => {}} />);
    expect(c1.firstChild).toBeNull();
    cleanup();
    const { container: c2 } = render(<ViewSwitcher views={[views[0]]} activeId="board" onChange={() => {}} />);
    expect(c2.firstChild).toBeNull();
  });
});
