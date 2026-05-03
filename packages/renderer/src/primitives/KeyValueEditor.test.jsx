// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import KeyValueEditor from "./KeyValueEditor.jsx";

afterEach(cleanup);

describe("KeyValueEditor (SDK primitive)", () => {
  it("рендерит pairs из value object", () => {
    render(
      <KeyValueEditor
        value={{ env: "prod", region: "us-east" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("env")).toBeTruthy();
    expect(screen.getByDisplayValue("prod")).toBeTruthy();
    expect(screen.getByDisplayValue("region")).toBeTruthy();
    expect(screen.getByDisplayValue("us-east")).toBeTruthy();
  });

  it("пустой value → один empty row для UI ввода", () => {
    render(<KeyValueEditor value={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Key 0")).toBeTruthy();
    expect(screen.getByLabelText("Value 0")).toBeTruthy();
  });

  it("add row → +Add Property добавляет новый пустой row", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor value={{ a: "1" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add Property"));
    // После add — 2 row'а в UI
    expect(screen.getByLabelText("Key 1")).toBeTruthy();
    // Emit'ится object без empty row (cleaned)
    expect(onChange).toHaveBeenCalledWith({ a: "1" });
  });

  it("ввод в новом row → emit'ится расширенный object", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor value={{ a: "1" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add Property"));
    fireEvent.change(screen.getByLabelText("Key 1"), { target: { value: "b" } });
    fireEvent.change(screen.getByLabelText("Value 1"), { target: { value: "2" } });
    // Final emit — extended object
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual({ a: "1", b: "2" });
  });

  it("remove row → emit'ится object без removed key", () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor
        value={{ a: "1", b: "2", c: "3" }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove 1"));
    expect(onChange).toHaveBeenCalledWith({ a: "1", c: "3" });
  });

  it("пустой ключ не emit'ится в cleaned object", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor value={{}} onChange={onChange} />);
    // У нас один empty row; вводим только value (без key)
    fireEvent.change(screen.getByLabelText("Value 0"), { target: { value: "orphan" } });
    // emit'нулся пустой object — пара "" → "orphan" filtered
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("trim ключа: '  foo  ' → 'foo'", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor value={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Key 0"), { target: { value: "  foo  " } });
    fireEvent.change(screen.getByLabelText("Value 0"), { target: { value: "bar" } });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual({ foo: "bar" });
  });

  it("disabled пропагируется на все inputs / buttons", () => {
    render(<KeyValueEditor value={{ a: "1" }} onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText("Key 0").disabled).toBe(true);
    expect(screen.getByLabelText("Value 0").disabled).toBe(true);
    expect(screen.getByLabelText("Remove 0").disabled).toBe(true);
    expect(screen.getByText("+ Add Property").disabled).toBe(true);
  });
});
