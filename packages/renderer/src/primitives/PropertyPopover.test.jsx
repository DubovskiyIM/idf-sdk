// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import PropertyPopover from "./PropertyPopover.jsx";

afterEach(cleanup);

describe("PropertyPopover — basic rendering", () => {
  it("пустое value → 'Нет properties'", () => {
    render(<PropertyPopover value={{}} />);
    expect(screen.getByText("Нет properties")).toBeTruthy();
  });

  it("non-object → 'Нет properties'", () => {
    render(<PropertyPopover value="foo" />);
    expect(screen.getByText("Нет properties")).toBeTruthy();
  });

  it("inline chip для первых 3 entries (default maxInline)", () => {
    render(<PropertyPopover value={{ a: 1, b: 2, c: 3, d: 4, e: 5 }} />);
    // Всего 5 entries, inline 3, overflow +2
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.getByText("c")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("maxInline=0 → только counter (нет inline)", () => {
    render(<PropertyPopover value={{ a: 1, b: 2 }} maxInline={0} />);
    expect(screen.queryByText("a", { selector: "span[style*='font-family']" })).toBeNull();
    // Есть trigger
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("overflowCount === 0 → показывает '⋯' как trigger", () => {
    const { container } = render(<PropertyPopover value={{ a: 1 }} maxInline={3} />);
    const btn = container.querySelector("button");
    expect(btn.textContent).toContain("⋯");
  });
});

describe("PropertyPopover — popover open/close", () => {
  it("click trigger → открывает popover со всеми entries", () => {
    render(<PropertyPopover value={{ env: "prod", region: "us-east-1", tier: "1" }} />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("env");
    expect(dialog.textContent).toContain("prod");
    expect(dialog.textContent).toContain("region");
    expect(dialog.textContent).toContain("tier");
  });

  it("второй click → закрывает", () => {
    render(<PropertyPopover value={{ a: 1 }} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.queryByRole("dialog")).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape закрывает popover", () => {
    render(<PropertyPopover value={{ a: 1 }} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("click вне popover → закрывает", () => {
    const { container } = render(
      <div>
        <PropertyPopover value={{ a: 1 }} />
        <div data-testid="outside">outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("aria-expanded обновляется при toggle", () => {
    render(<PropertyPopover value={{ a: 1 }} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("PropertyPopover — value formatting", () => {
  it("boolean → 'true'/'false'", () => {
    render(<PropertyPopover value={{ enabled: true, disabled: false }} maxInline={0} />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("true");
    expect(dialog.textContent).toContain("false");
  });

  it("null → '—'", () => {
    render(<PropertyPopover value={{ optional: null }} maxInline={0} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog").textContent).toContain("—");
  });

  it("nested object → stringified", () => {
    render(<PropertyPopover value={{ nested: { a: 1 } }} maxInline={0} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog").textContent).toContain('"a":1');
  });
});

describe("PropertyPopover — adapter delegation", () => {
  it("использует adapter если зарегистрирован", () => {
    const Adapted = ({ value }) => <div data-testid="adapter-pp">adapter:{Object.keys(value).length}</div>;
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "propertyPopover" ? Adapted : null,
      },
    };
    render(<PropertyPopover value={{ a: 1, b: 2 }} ctx={ctx} />);
    expect(screen.getByTestId("adapter-pp").textContent).toBe("adapter:2");
  });
});
