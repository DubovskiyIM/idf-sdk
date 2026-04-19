/**
 * Integration: ParameterControl + pickAdaptedComponent + affinity.
 *
 * Проверяем, что spec с fieldRole автоматически выбирает правильный
 * компонент адаптера через matching-score (не требует прямого
 * spec.control = "number").
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import ParameterControl from "./index.jsx";
import { registerUIAdapter } from "../adapters/registry.js";

afterEach(() => {
  registerUIAdapter(null);
  cleanup();
});

// Mock-adapter с affinity на number-компоненте: «умеет» роль "price"
function makeAdapterWithAffinity() {
  const TextStub = ({ spec }) => <div data-kind="text" data-name={spec?.name} />;
  const NumberStub = ({ spec }) => <div data-kind="number" data-role={spec?.fieldRole} />;
  NumberStub.affinity = {
    roles: ["money", "price", "percentage"],
    types: ["number"],
    fields: ["amount", "price", "fee"],
  };
  const DateTimeStub = ({ spec }) => <div data-kind="datetime" data-withtime={String(spec?.withTime || false)} />;
  DateTimeStub.affinity = {
    roles: ["timestamp"],
    types: ["datetime"],
    features: ["withTime"],
  };
  return {
    name: "test",
    parameter: {
      text: TextStub,
      number: NumberStub,
      datetime: DateTimeStub,
    },
  };
}

describe("ParameterControl + matching-score integration", () => {
  it("spec.control=\"text\" + fieldRole=\"price\" → число-компонент", () => {
    registerUIAdapter(makeAdapterWithAffinity());
    const { container } = render(
      <ParameterControl
        spec={{ name: "unitPrice", control: "text", fieldRole: "price" }}
        value=""
        onChange={() => {}}
      />
    );
    expect(container.querySelector("[data-kind]").dataset.kind).toBe("number");
  });

  it("spec.name=\"fee\" → число-компонент (field-affinity)", () => {
    registerUIAdapter(makeAdapterWithAffinity());
    const { container } = render(
      <ParameterControl
        spec={{ name: "fee", control: "text" }}
        value=""
        onChange={() => {}}
      />
    );
    expect(container.querySelector("[data-kind]").dataset.kind).toBe("number");
  });

  it("spec.control=\"text\" без fieldRole → текст-компонент (back-compat)", () => {
    registerUIAdapter(makeAdapterWithAffinity());
    const { container } = render(
      <ParameterControl
        spec={{ name: "title", control: "text" }}
        value=""
        onChange={() => {}}
      />
    );
    expect(container.querySelector("[data-kind]").dataset.kind).toBe("text");
  });

  it("spec.withTime=true → datetime с feature-affinity", () => {
    registerUIAdapter(makeAdapterWithAffinity());
    const { container } = render(
      <ParameterControl
        spec={{ name: "deadline", control: "datetime", withTime: true }}
        value=""
        onChange={() => {}}
      />
    );
    const node = container.querySelector("[data-kind]");
    expect(node.dataset.kind).toBe("datetime");
    expect(node.dataset.withtime).toBe("true");
  });

  it("без адаптера → built-in fallback (TextControl)", () => {
    registerUIAdapter(null);
    const { container } = render(
      <ParameterControl
        spec={{ name: "title", control: "text" }}
        value=""
        onChange={() => {}}
      />
    );
    expect(container.querySelector("input")).toBeTruthy();
  });

  it("adapter не имеет нужного control → built-in fallback", () => {
    registerUIAdapter({
      name: "partial",
      parameter: { text: ({ spec }) => <div data-kind="text-only" /> },
    });
    const { container } = render(
      <ParameterControl
        spec={{ name: "file", control: "file" }}
        value=""
        onChange={() => {}}
      />
    );
    // FileControl built-in рендерит input[type=file]
    expect(container.querySelector("input[type=\"file\"]")).toBeTruthy();
  });
});
