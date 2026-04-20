/**
 * PresetChips — quick-value chips под параметром (UI-gap #3).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import PresetChips from "./PresetChips.jsx";
import ParameterControl from "./index.jsx";
import { registerUIAdapter } from "../adapters/registry.js";

afterEach(() => {
  registerUIAdapter(null);
  cleanup();
});

describe("PresetChips", () => {
  it("не рендерится без presets", () => {
    const { container } = render(<PresetChips presets={undefined} value="" onChange={() => {}} />);
    expect(container.textContent).toBe("");
  });

  it("не рендерится при пустом массиве", () => {
    const { container } = render(<PresetChips presets={[]} value="" onChange={() => {}} />);
    expect(container.textContent).toBe("");
  });

  it("рендерит chip'ы для каждого preset", () => {
    const { getAllByRole } = render(
      <PresetChips
        presets={[{ label: "500 ₽", value: 500 }, { label: "1500 ₽", value: 1500 }]}
        value={null}
        onChange={() => {}}
      />,
    );
    const buttons = getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("500 ₽");
    expect(buttons[1].textContent).toBe("1500 ₽");
  });

  it("click → onChange(preset.value)", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <PresetChips
        presets={[{ label: "500", value: 500 }]}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(getAllByRole("button")[0]);
    expect(onChange).toHaveBeenCalledWith(500);
  });

  it("aria-pressed=true когда value совпадает с preset", () => {
    const { getAllByRole } = render(
      <PresetChips
        presets={[{ label: "500", value: 500 }, { label: "1500", value: 1500 }]}
        value={500}
        onChange={() => {}}
      />,
    );
    const buttons = getAllByRole("button");
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("shortcut form: preset as plain value (не { label, value })", () => {
    const { getAllByRole } = render(
      <PresetChips
        presets={[500, 1500]}
        value={null}
        onChange={() => {}}
      />,
    );
    const buttons = getAllByRole("button");
    expect(buttons[0].textContent).toBe("500");
    expect(buttons[1].textContent).toBe("1500");
  });
});

describe("ParameterControl + presets integration", () => {
  it("text-control с presets показывает chip'ы под input'ом", () => {
    const { getAllByRole } = render(
      <ParameterControl
        spec={{
          name: "city",
          control: "text",
          presets: [{ label: "Москва", value: "Москва" }, { label: "СПб", value: "СПб" }],
        }}
        value=""
        onChange={() => {}}
      />,
    );
    const buttons = getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("click на chip обновляет value через onChange", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <ParameterControl
        spec={{
          name: "budget",
          control: "number",
          presets: [{ label: "500", value: 500 }],
        }}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(getAllByRole("button")[0]);
    expect(onChange).toHaveBeenCalledWith(500);
  });

  it("file-control с presets — chip'ы НЕ рендерятся (file не capable)", () => {
    const { queryByRole } = render(
      <ParameterControl
        spec={{
          name: "avatar",
          control: "file",
          presets: [{ label: "default", value: "data:..." }],
        }}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("datetime-control с presets рендерит chip'ы", () => {
    const now = Date.now();
    const { getAllByRole } = render(
      <ParameterControl
        spec={{
          name: "deadline",
          control: "datetime",
          presets: [
            { label: "Через 2 часа", value: new Date(now + 2 * 3600 * 1000).toISOString() },
            { label: "Через 6 часов", value: new Date(now + 6 * 3600 * 1000).toISOString() },
          ],
        }}
        value=""
        onChange={() => {}}
      />,
    );
    expect(getAllByRole("button")).toHaveLength(2);
  });
});
