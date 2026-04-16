// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import EmptyState from "./EmptyState.jsx";

afterEach(cleanup);

describe("EmptyState — primitive", () => {
  it("отрисовывает title", () => {
    const { getByText } = render(<EmptyState title="Ничего нет" />);
    expect(getByText("Ничего нет")).toBeTruthy();
  });

  it("дефолтная иконка — 📭", () => {
    const { getByText } = render(<EmptyState title="x" />);
    expect(getByText("📭")).toBeTruthy();
  });

  it("кастомная иконка перебивает дефолт", () => {
    const { getByText, queryByText } = render(<EmptyState title="x" icon="🚀" />);
    expect(getByText("🚀")).toBeTruthy();
    expect(queryByText("📭")).toBeNull();
  });

  it("hint отрисовывается только когда передан", () => {
    const { queryByText, rerender } = render(<EmptyState title="x" />);
    expect(queryByText("hint-text")).toBeNull();
    rerender(<EmptyState title="x" hint="hint-text" />);
    expect(queryByText("hint-text")).toBeTruthy();
  });

  it("size='sm' меняет вертикальный padding (24px vs 64px)", () => {
    const { container, rerender } = render(<EmptyState title="x" size="md" />);
    expect(container.firstChild.style.padding).toBe("64px 32px");
    rerender(<EmptyState title="x" size="sm" />);
    expect(container.firstChild.style.padding).toBe("24px 16px");
  });
});
