// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { useRef } from "react";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { filterSlashOptions, SLASH_OPTIONS, SlashMenuPopup } from "./SlashMenu.jsx";

afterEach(cleanup);

describe("filterSlashOptions", () => {
  it("пустой query → все options", () => {
    expect(filterSlashOptions("")).toHaveLength(SLASH_OPTIONS.length);
  });

  it("по label fragment", () => {
    const result = filterSlashOptions("head");
    expect(result.map(o => o.kind)).toEqual(["heading-1", "heading-2", "heading-3"]);
  });

  it("по kind fragment", () => {
    const result = filterSlashOptions("bullet");
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("bulleted-list-item");
  });

  it("по alias", () => {
    const result = filterSlashOptions("h2");
    expect(result.some(o => o.kind === "heading-2")).toBe(true);
  });

  it("alias 'todo' → to-do", () => {
    const result = filterSlashOptions("todo");
    expect(result.some(o => o.kind === "to-do")).toBe(true);
  });

  it("несуществующий → пустой", () => {
    expect(filterSlashOptions("xyzzy")).toEqual([]);
  });

  it("case-insensitive", () => {
    expect(filterSlashOptions("CODE")[0]?.kind).toBe("code");
  });
});

function PopupHarness({ refOut }) {
  const ref = useRef(null);
  refOut.current = ref;
  return <SlashMenuPopup ref={ref} />;
}

describe("SlashMenuPopup", () => {
  it("hidden по умолчанию", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("show() рендерит menu со всеми options", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 100, y: 200, query: "", onSelect: () => {} });
    });
    const menu = screen.getByRole("menu");
    expect(menu).toBeTruthy();
    expect(screen.getByText("Heading 1")).toBeTruthy();
    expect(screen.getByText("Bullet list")).toBeTruthy();
    expect(screen.getByText("To-do")).toBeTruthy();
  });

  it("query фильтрует options", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "head", onSelect: () => {} });
    });
    expect(screen.getByText("Heading 1")).toBeTruthy();
    expect(screen.getByText("Heading 2")).toBeTruthy();
    expect(screen.queryByText("Bullet list")).toBeNull();
  });

  it("update() меняет query", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "", onSelect: () => {} });
    });
    expect(screen.getByText("Bullet list")).toBeTruthy();
    act(() => {
      refOut.current.current.update({ query: "todo" });
    });
    expect(screen.queryByText("Bullet list")).toBeNull();
    expect(screen.getByText("To-do")).toBeTruthy();
  });

  it("hide() убирает menu", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "", onSelect: () => {} });
    });
    expect(screen.queryByRole("menu")).not.toBeNull();
    act(() => {
      refOut.current.current.hide();
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("click на item зовёт onSelect(kind)", () => {
    const refOut = { current: null };
    const onSelect = vi.fn();
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "", onSelect });
    });
    fireEvent.mouseDown(screen.getByText("Heading 1"));
    expect(onSelect).toHaveBeenCalledWith("heading-1");
  });

  it("handleKeyDown: ArrowDown → активный idx меняется (через Enter check)", () => {
    const refOut = { current: null };
    const onSelect = vi.fn();
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "", onSelect });
    });
    let handled;
    act(() => {
      handled = refOut.current.current.handleKeyDown({ key: "ArrowDown" });
    });
    expect(handled).toBe(true);
    act(() => {
      refOut.current.current.handleKeyDown({ key: "Enter" });
    });
    // первый ArrowDown идёт с активным idx=0 на 1, Enter эмитит heading-2
    expect(onSelect).toHaveBeenCalledWith("heading-2");
  });

  it("handleKeyDown: Escape → hide", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "", onSelect: () => {} });
    });
    expect(screen.queryByRole("menu")).not.toBeNull();
    act(() => {
      refOut.current.current.handleKeyDown({ key: "Escape" });
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("handleKeyDown в hidden state → false", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    let handled;
    act(() => {
      handled = refOut.current.current.handleKeyDown({ key: "ArrowDown" });
    });
    expect(handled).toBe(false);
  });

  it("handleKeyDown с пустым filtered (нет matches) → false", () => {
    const refOut = { current: null };
    render(<PopupHarness refOut={refOut} />);
    act(() => {
      refOut.current.current.show({ x: 0, y: 0, query: "xyzzy", onSelect: () => {} });
    });
    let handled;
    act(() => {
      handled = refOut.current.current.handleKeyDown({ key: "ArrowDown" });
    });
    expect(handled).toBe(false);
  });
});
