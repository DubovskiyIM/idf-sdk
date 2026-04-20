// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import EmptyState from "./EmptyState.jsx";
import SlotRenderer from "../SlotRenderer.jsx";

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

  it("primitive mode: node-shape передаётся как props", () => {
    const node = { type: "emptyState", title: "Нет данных", hint: "Создайте" };
    const { getByText } = render(<EmptyState node={node} ctx={null} />);
    expect(getByText("Нет данных")).toBeTruthy();
    expect(getByText("Создайте")).toBeTruthy();
  });

  it("illustration как URL → <img>", () => {
    const { container } = render(
      <EmptyState title="x" illustration="https://example.com/art.svg" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/art.svg");
  });

  it("illustration перебивает icon", () => {
    const { queryByText, container } = render(
      <EmptyState title="x" icon="🚀" illustration="/art.svg" />,
    );
    expect(container.querySelector("img")).toBeTruthy();
    expect(queryByText("🚀")).toBeNull();
  });

  it("cta click → ctx.exec(intentId, params)", () => {
    const exec = vi.fn();
    const node = {
      type: "emptyState",
      title: "x",
      cta: { label: "Создать", intentId: "create_task_draft" },
    };
    const { getByText } = render(<EmptyState node={node} ctx={{ exec }} />);
    fireEvent.click(getByText("Создать"));
    expect(exec).toHaveBeenCalledWith("create_task_draft", {});
  });

  it("cta custom onClick вместо intentId", () => {
    const onClick = vi.fn();
    const node = {
      type: "emptyState",
      title: "x",
      cta: { label: "Custom", onClick },
    };
    const { getByText } = render(<EmptyState node={node} ctx={null} />);
    fireEvent.click(getByText("Custom"));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("SlotRenderer emptyState dispatch", () => {
  it("item.type='emptyState' → EmptyState через PRIMITIVES", () => {
    const item = { type: "emptyState", title: "Нет задач", hint: "Создайте" };
    const { getByText } = render(<SlotRenderer item={item} ctx={{}} />);
    expect(getByText("Нет задач")).toBeTruthy();
  });
});
