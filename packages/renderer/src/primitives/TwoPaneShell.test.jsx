// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TwoPaneShell from "./TwoPaneShell.jsx";

afterEach(cleanup);

const SECTIONS = [
  { key: "tags",     label: "Tags" },
  { key: "policies", label: "Policies" },
  { key: "filters",  label: "Row Filters", disabled: true },
];

describe("TwoPaneShell (SDK)", () => {
  it("рендерит left-submenu + right body", () => {
    render(<TwoPaneShell sections={SECTIONS} active="tags" onSelect={vi.fn()} title="Data Compliance"><div>BODY</div></TwoPaneShell>);
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByText("Policies")).toBeTruthy();
    expect(screen.getByText("Row Filters")).toBeTruthy();
    expect(screen.getByText("BODY")).toBeTruthy();
  });

  it("active section подсвечена", () => {
    render(<TwoPaneShell sections={SECTIONS} active="policies" onSelect={vi.fn()}><div>x</div></TwoPaneShell>);
    const policiesTab = screen.getByText("Policies").closest("button");
    expect(policiesTab.getAttribute("aria-current")).toBe("page");
  });

  it("click по section вызывает onSelect", () => {
    const onSelect = vi.fn();
    render(<TwoPaneShell sections={SECTIONS} active="tags" onSelect={onSelect}><div>x</div></TwoPaneShell>);
    fireEvent.click(screen.getByText("Policies"));
    expect(onSelect).toHaveBeenCalledWith("policies");
  });

  it("disabled section не вызывает onSelect", () => {
    const onSelect = vi.fn();
    render(<TwoPaneShell sections={SECTIONS} active="tags" onSelect={onSelect}><div>x</div></TwoPaneShell>);
    fireEvent.click(screen.getByText("Row Filters"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
