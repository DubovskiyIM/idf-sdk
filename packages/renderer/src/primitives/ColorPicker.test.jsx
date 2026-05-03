// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ColorPicker, { PALETTE, randomColor } from "./ColorPicker.jsx";

afterEach(cleanup);

describe("ColorPicker (SDK primitive)", () => {
  it("рендерит initial value в color input и hex text input", () => {
    render(<ColorPicker value="#0369a1" onChange={vi.fn()} />);
    const colorInput = screen.getByLabelText("Color picker");
    const hexInput = screen.getByLabelText("Color hex");
    expect(colorInput.value).toBe("#0369a1");
    expect(hexInput.value).toBe("#0369a1");
  });

  it("default value '#6478f7' при отсутствии value prop", () => {
    render(<ColorPicker onChange={vi.fn()} />);
    const hexInput = screen.getByLabelText("Color hex");
    expect(hexInput.value).toBe("#6478f7");
  });

  it("onChange вызывается при изменении color input", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#0369a1" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Color picker"), { target: { value: "#16a34a" } });
    expect(onChange).toHaveBeenCalledWith("#16a34a");
  });

  it("onChange вызывается при изменении hex text input", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#0369a1" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Color hex"), { target: { value: "#dc2626" } });
    expect(onChange).toHaveBeenCalledWith("#dc2626");
  });

  it("refresh button заменяет value на random из PALETTE", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#0369a1" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Refresh color"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0];
    expect(PALETTE).toContain(emitted);
  });

  it("disabled пропагируется на все controls", () => {
    render(<ColorPicker value="#0369a1" onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText("Color picker").disabled).toBe(true);
    expect(screen.getByLabelText("Color hex").disabled).toBe(true);
    expect(screen.getByLabelText("Refresh color").disabled).toBe(true);
  });

  it("randomColor() возвращает значение из PALETTE", () => {
    for (let i = 0; i < 20; i++) {
      expect(PALETTE).toContain(randomColor());
    }
  });
});
