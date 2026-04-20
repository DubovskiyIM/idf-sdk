// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import TreeNav from "./TreeNav.jsx";
import SlotRenderer from "../SlotRenderer.jsx";

afterEach(cleanup);

const node = {
  type: "treeNav",
  root: "Metalake",
  levels: [
    { depth: 0, entity: "Metalake", children: ["Catalog"] },
    { depth: 1, entity: "Catalog", children: ["Schema"] },
    { depth: 2, entity: "Schema", children: [] },
  ],
};

describe("TreeNav primitive", () => {
  it("empty levels → не рендерится", () => {
    const { container } = render(<TreeNav node={{ levels: [] }} ctx={{}} />);
    expect(container.textContent).toBe("");
  });

  it("рендерит heading + все levels", () => {
    const { getByText } = render(<TreeNav node={node} ctx={{}} />);
    expect(getByText("Иерархия")).toBeTruthy();
    expect(getByText("Metalake")).toBeTruthy();
    expect(getByText("Catalog")).toBeTruthy();
    expect(getByText("Schema")).toBeTruthy();
  });

  it("depth влияет на paddingLeft", () => {
    const { container } = render(<TreeNav node={node} ctx={{}} />);
    const level0 = container.querySelector("[data-tree-level='0']");
    const level1 = container.querySelector("[data-tree-level='1']");
    expect(level0.style.paddingLeft).toBe("0px");
    expect(level1.style.paddingLeft).toBe("14px");
  });

  it("показывает счётчик children", () => {
    const { container } = render(<TreeNav node={node} ctx={{}} />);
    // Metalake имеет 1 child → span с "1"
    const metalakeRow = container.querySelector("[data-tree-level='0']");
    expect(metalakeRow.textContent).toContain("1");
  });

  it("click по узлу → ctx.navigate с <entity>_list", () => {
    const navigate = vi.fn(() => true);
    const { getAllByRole } = render(<TreeNav node={node} ctx={{ navigate }} />);
    fireEvent.click(getAllByRole("button")[0]);
    expect(navigate).toHaveBeenCalledWith("metalake_list", { entity: "Metalake" });
  });

  it("aria-label='Hierarchy'", () => {
    const { container } = render(<TreeNav node={node} ctx={{}} />);
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Hierarchy");
  });
});

describe("SlotRenderer dispatch → treeNav", () => {
  it("item.type='treeNav' → TreeNav primitive", () => {
    const { getByText } = render(<SlotRenderer item={node} ctx={{}} />);
    expect(getByText("Metalake")).toBeTruthy();
  });
});
