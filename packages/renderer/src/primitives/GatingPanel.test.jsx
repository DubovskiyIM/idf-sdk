// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import GatingPanel from "./GatingPanel.jsx";
import SlotRenderer from "../SlotRenderer.jsx";

afterEach(cleanup);

describe("GatingPanel (UI-gap #6)", () => {
  it("empty steps → не рендерится", () => {
    const { container } = render(
      <GatingPanel node={{ type: "gatingPanel", steps: [] }} ctx={{}} />,
    );
    expect(container.textContent).toBe("");
  });

  it("все steps done → panel скрыт", () => {
    const node = {
      type: "gatingPanel",
      title: "Шаги",
      steps: [
        { id: "a", label: "A", done: "viewer.a === true" },
        { id: "b", label: "B", done: "viewer.b === true" },
      ],
    };
    const { container } = render(
      <GatingPanel node={node} ctx={{ viewer: { a: true, b: true } }} />,
    );
    expect(container.textContent).toBe("");
  });

  it("хоть один step не done → panel рендерится", () => {
    const node = {
      type: "gatingPanel",
      title: "Необходимые шаги",
      steps: [
        { id: "a", label: "Шаг A", done: "viewer.a === true" },
        { id: "b", label: "Шаг B", done: "viewer.b === true" },
      ],
    };
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: { a: true, b: false } }} />,
    );
    expect(getByText("Необходимые шаги")).toBeTruthy();
    expect(getByText("Шаг A")).toBeTruthy();
    expect(getByText("Шаг B")).toBeTruthy();
  });

  it("step done → зелёная плашка 'Пройдено'", () => {
    const node = {
      steps: [
        { id: "a", label: "A", done: "viewer.a === true" },
        { id: "b", label: "B" },  // не done, не задано — false
      ],
    };
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: { a: true } }} />,
    );
    expect(getByText("Пройдено")).toBeTruthy();
  });

  it("step не done + cta → кнопка с cta.label", () => {
    const node = {
      steps: [
        { id: "t", label: "Тест",
          done: "viewer.tested === true",
          cta: { label: "Пройти", intentId: "start_test" } },
      ],
    };
    const exec = vi.fn();
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: {}, exec }} />,
    );
    fireEvent.click(getByText("Пройти"));
    expect(exec).toHaveBeenCalledWith("start_test", {});
  });

  it("cta custom onClick вместо intentId", () => {
    const onClick = vi.fn();
    const node = {
      steps: [
        { id: "t", label: "x",
          done: "viewer.x === true",
          cta: { label: "Custom", onClick } },
      ],
    };
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: {} }} />,
    );
    fireEvent.click(getByText("Custom"));
    expect(onClick).toHaveBeenCalled();
  });

  it("step без done, без cta → 'Не выполнено'", () => {
    const node = { steps: [{ id: "t", label: "x" }] };
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: {} }} />,
    );
    expect(getByText("Не выполнено")).toBeTruthy();
  });

  it("icon рендерится в step", () => {
    const node = {
      steps: [
        { id: "t", label: "Регистрация", icon: "👤", done: "viewer.x === true" },
      ],
    };
    const { getByText } = render(
      <GatingPanel node={node} ctx={{ viewer: {} }} />,
    );
    expect(getByText("👤")).toBeTruthy();
  });
});

describe("SlotRenderer dispatch — gatingPanel", () => {
  it("item.type='gatingPanel' → GatingPanel primitive", () => {
    const item = {
      type: "gatingPanel",
      title: "Steps",
      steps: [{ id: "a", label: "Step A" }],
    };
    const { getByText } = render(<SlotRenderer item={item} ctx={{ viewer: {} }} />);
    expect(getByText("Steps")).toBeTruthy();
  });
});
