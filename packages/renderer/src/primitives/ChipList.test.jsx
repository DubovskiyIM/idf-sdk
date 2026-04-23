// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ChipList from "./ChipList.jsx";

afterEach(cleanup);

describe("ChipList — basic rendering", () => {
  it("string items → text chips", () => {
    render(<ChipList value={["PII", "Financial", "Compliance"]} />);
    expect(screen.getByText("PII")).toBeTruthy();
    expect(screen.getByText("Financial")).toBeTruthy();
    expect(screen.getByText("Compliance")).toBeTruthy();
  });

  it("object items с {name} → label из name", () => {
    render(<ChipList value={[{ name: "tag1" }, { name: "tag2", icon: "🏷" }]} />);
    expect(screen.getByText("tag1")).toBeTruthy();
    expect(screen.getByText("tag2")).toBeTruthy();
    expect(screen.getByText("🏷")).toBeTruthy();
  });

  it("пустой array → emptyLabel", () => {
    render(<ChipList value={[]} emptyLabel="No tags" />);
    expect(screen.getByText("No tags")).toBeTruthy();
  });

  it("default emptyLabel = 'Нет'", () => {
    render(<ChipList value={[]} />);
    expect(screen.getByText("Нет")).toBeTruthy();
  });

  it("non-array value → empty", () => {
    render(<ChipList value={"foo"} emptyLabel="none" />);
    expect(screen.getByText("none")).toBeTruthy();
  });
});

describe("ChipList — overflow", () => {
  it("maxVisible=3 → показывает 3 chips + '+N'", () => {
    render(<ChipList value={["a", "b", "c", "d", "e"]} maxVisible={3} />);
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.getByText("c")).toBeTruthy();
    expect(screen.queryByText("d")).toBeNull();
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("items.length <= maxVisible → нет overflow", () => {
    render(<ChipList value={["a", "b"]} maxVisible={5} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});

describe("ChipList — variants", () => {
  it("variant='policy' применяется к chip stylesheet", () => {
    const { container } = render(<ChipList value={["X"]} variant="policy" />);
    const chip = container.querySelector("span[style*='background']");
    const style = chip?.getAttribute("style") || "";
    // policy variant сейчас жёлто-amber (fef3c7 или через CSS var)
    expect(style).toMatch(/policy-bg|fef3c7/);
  });

  it("variant='role' — другой цвет (purple/ede9fe)", () => {
    const { container } = render(<ChipList value={["admin"]} variant="role" />);
    const chip = container.querySelector("span[style*='background']");
    const style = chip?.getAttribute("style") || "";
    expect(style).toMatch(/role-bg|ede9fe/);
  });

  it("default variant='tag'", () => {
    const { container } = render(<ChipList value={["X"]} />);
    const chip = container.querySelector("span[style*='background']");
    const style = chip?.getAttribute("style") || "";
    expect(style).toMatch(/bg-subtle|eef2f7/);
  });
});

describe("ChipList — interactions", () => {
  it("onItemClick вызывается при click на chip", () => {
    const onItemClick = vi.fn();
    render(<ChipList value={["alpha", "beta"]} onItemClick={onItemClick} />);
    fireEvent.click(screen.getByText("alpha"));
    expect(onItemClick).toHaveBeenCalledWith("alpha");
  });

  it("onDetach показывает '×' на каждом chip'е + вызывается при click", () => {
    const onDetach = vi.fn();
    render(<ChipList value={["x", "y"]} onDetach={onDetach} />);
    const detachBtns = screen.getAllByLabelText(/Detach/);
    expect(detachBtns.length).toBe(2);
    fireEvent.click(detachBtns[0]);
    expect(onDetach).toHaveBeenCalledWith("x", 0);
  });

  it("detach click stopPropagation — не вызывает onItemClick", () => {
    const onItemClick = vi.fn();
    const onDetach = vi.fn();
    render(<ChipList value={["x"]} onItemClick={onItemClick} onDetach={onDetach} />);
    fireEvent.click(screen.getByLabelText("Detach x"));
    expect(onDetach).toHaveBeenCalled();
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it("Enter на clickable chip (keyboard) → onItemClick", () => {
    const onItemClick = vi.fn();
    render(<ChipList value={["x"]} onItemClick={onItemClick} />);
    const chip = screen.getByText("x").closest("span[role='button']");
    fireEvent.keyDown(chip, { key: "Enter" });
    expect(onItemClick).toHaveBeenCalled();
  });
});

describe("ChipList — adapter delegation", () => {
  it("использует adapter если зарегистрирован", () => {
    const Adapted = ({ value }) => <div data-testid="adapter-chip">adapter:{value.length}</div>;
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "chipList" ? Adapted : null,
      },
    };
    render(<ChipList value={["a", "b", "c"]} ctx={ctx} />);
    expect(screen.getByTestId("adapter-chip").textContent).toBe("adapter:3");
  });
});
