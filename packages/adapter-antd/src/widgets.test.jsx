/**
 * Юнит-тесты виджетов adapter-antd (backlog §2).
 * Рендер через @testing-library/react + jsdom.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { antdAdapter } from "./adapter.jsx";

function get(kind, type) {
  return antdAdapter[kind][type];
}

describe("adapter-antd buttons (2.1)", () => {
  it("PrimaryButton читает children и рендерит их", () => {
    const Primary = get("button", "primary");
    render(<Primary onClick={() => {}}>Сохранить</Primary>);
    expect(screen.getByRole("button", { name: /Сохранить/ })).toBeTruthy();
  });

  it("PrimaryButton читает label (обратная совместимость)", () => {
    const Primary = get("button", "primary");
    render(<Primary label="Создать" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /Создать/ })).toBeTruthy();
  });

  it("PrimaryButton: label имеет приоритет над children", () => {
    const Primary = get("button", "primary");
    render(<Primary label="LABEL" onClick={() => {}}>CHILDREN</Primary>);
    expect(screen.getByRole("button", { name: /LABEL/ })).toBeTruthy();
    expect(screen.queryByText("CHILDREN")).toBeNull();
  });

  it("SecondaryButton с children", () => {
    const Sec = get("button", "secondary");
    render(<Sec onClick={() => {}}>Отмена</Sec>);
    expect(screen.getByRole("button", { name: /Отмена/ })).toBeTruthy();
  });

  it("DangerButton с children", () => {
    const Danger = get("button", "danger");
    render(<Danger onClick={() => {}}>Удалить</Danger>);
    expect(screen.getByRole("button", { name: /Удалить/ })).toBeTruthy();
  });
});

describe("AntdDateTime (2.2)", () => {
  it("spec.withTime=true включает time-picker (placeholder с временем)", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "deadline", withTime: true }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).toMatch(/время/i);
  });

  it("spec.precision=\"minute\" включает time-picker", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "startAt", precision: "minute" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).toMatch(/время/i);
  });

  it("без withTime и precision → date-only (placeholder без времени)", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "birthDate" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).not.toMatch(/время/i);
  });
});

describe("AntdNumber fieldRole (2.3)", () => {
  it("fieldRole=\"money\" → prefix ₽", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "fee", fieldRole: "money" }} value={100} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("₽");
  });

  it("fieldRole=\"price\" → prefix ₽ (backlog 2.3)", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "amount", fieldRole: "price" }} value={100} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("₽");
  });

  it("fieldRole=\"percentage\" → suffix %", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "rate", fieldRole: "percentage" }} value={5} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("%");
  });
});

describe("AntdTextInput validation attrs (2.4)", () => {
  it("maxLength пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "cardLastFour", maxLength: 4 }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("maxlength")).toBe("4");
  });

  it("pattern пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "cardLastFour", pattern: "\\d{4}" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("pattern")).toBe("\\d{4}");
  });

  it("minLength пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "pin", minLength: 6 }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("minlength")).toBe("6");
  });
});
