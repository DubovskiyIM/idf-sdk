// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import MethodSelectControl from "./MethodSelectControl.jsx";
import ParameterControl from "./index.jsx";

afterEach(cleanup);

const options = [
  { id: "kassa", label: "Мир/Visa/Mastercard", sublabel: "Kassa", icon: "💳", group: "Банковская карта" },
  { id: "sbp", label: "СБП", sublabel: "Система быстрых платежей", icon: "⚡", group: "Банковская карта" },
  { id: "paypal", label: "PayPal", icon: "💰", group: "Электронные деньги" },
  { id: "stripe", label: "Visa/Mastercard", sublabel: "Stripe", icon: "💳", group: "Другое" },
];

describe("MethodSelectControl (UI-gap #4)", () => {
  it("рендерит radio-card grid с опциями", () => {
    const { getAllByRole } = render(
      <MethodSelectControl spec={{ name: "method", options }} value={null} onChange={() => {}} />,
    );
    const radios = getAllByRole("radio");
    expect(radios).toHaveLength(4);
  });

  it("группирует по option.group — group header рендерится", () => {
    const { getByText } = render(
      <MethodSelectControl spec={{ name: "method", options }} value={null} onChange={() => {}} />,
    );
    expect(getByText("Банковская карта")).toBeTruthy();
    expect(getByText("Электронные деньги")).toBeTruthy();
    expect(getByText("Другое")).toBeTruthy();
  });

  it("click → onChange(option.id)", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <MethodSelectControl spec={{ name: "method", options }} value={null} onChange={onChange} />,
    );
    fireEvent.click(getAllByRole("radio")[0]);
    expect(onChange).toHaveBeenCalledWith("kassa");
  });

  it("aria-checked=true когда value совпадает с option.id", () => {
    const { getAllByRole } = render(
      <MethodSelectControl spec={{ name: "method", options }} value="paypal" onChange={() => {}} />,
    );
    const radios = getAllByRole("radio");
    const paypalRadio = radios.find(r => r.textContent.includes("PayPal"));
    expect(paypalRadio.getAttribute("aria-checked")).toBe("true");
  });

  it("опции без group падают в unlabeled group", () => {
    const flatOptions = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ];
    const { getAllByRole, queryByText } = render(
      <MethodSelectControl spec={{ name: "x", options: flatOptions }} value={null} onChange={() => {}} />,
    );
    expect(getAllByRole("radio")).toHaveLength(2);
    // Никаких group-header'ов
    expect(queryByText("undefined")).toBeNull();
  });

  it("label + required * рендерятся когда spec.label задан", () => {
    const { getByText } = render(
      <MethodSelectControl
        spec={{ name: "method", label: "Способ оплаты", required: true, options }}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(getByText("Способ оплаты")).toBeTruthy();
    expect(getByText("*")).toBeTruthy();
  });

  it("sublabel (secondary) рендерится под label", () => {
    const { getByText } = render(
      <MethodSelectControl spec={{ name: "method", options }} value={null} onChange={() => {}} />,
    );
    expect(getByText("Kassa")).toBeTruthy();
    expect(getByText("Система быстрых платежей")).toBeTruthy();
  });
});

describe("ParameterControl dispatch → methodSelect", () => {
  it("spec.control='methodSelect' → MethodSelectControl", () => {
    const { getAllByRole } = render(
      <ParameterControl
        spec={{ name: "method", control: "methodSelect", options }}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(getAllByRole("radio")).toHaveLength(4);
  });
});
