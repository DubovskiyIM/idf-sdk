// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import SchemaEditor from "./SchemaEditor.jsx";

afterEach(cleanup);

const sample = [
  { name: "id", type: "bigint", nullable: false, comment: "primary key" },
  { name: "email", type: "varchar", length: 320, nullable: true },
  { name: "balance", type: "decimal", precision: 10, scale: 2, nullable: true },
];

describe("SchemaEditor — read-only mode", () => {
  it("рендерит колонки как table", () => {
    render(<SchemaEditor value={sample} readOnly />);
    expect(screen.getByText("id")).toBeTruthy();
    expect(screen.getByText("email")).toBeTruthy();
    expect(screen.getByText("balance")).toBeTruthy();
  });

  it("показывает type в code-badge", () => {
    const { container } = render(<SchemaEditor value={sample} readOnly />);
    const codes = container.querySelectorAll("code");
    const types = Array.from(codes).map(c => c.textContent);
    expect(types).toEqual(expect.arrayContaining(["bigint", "varchar", "decimal"]));
  });

  it("varchar показывает length как (N)", () => {
    render(<SchemaEditor value={sample} readOnly />);
    expect(screen.getByText("(320)")).toBeTruthy();
  });

  it("decimal показывает precision и scale как (P,S)", () => {
    render(<SchemaEditor value={sample} readOnly />);
    expect(screen.getByText("(10,2)")).toBeTruthy();
  });

  it("nullable=false показывается как ✗, true как ✓", () => {
    const { container } = render(<SchemaEditor value={sample} readOnly />);
    const text = container.textContent || "";
    expect(text).toContain("✗");
    expect(text).toContain("✓");
  });

  it("пустой value + readOnly → 'Нет колонок'", () => {
    render(<SchemaEditor value={[]} readOnly />);
    expect(screen.getByText("Нет колонок")).toBeTruthy();
  });

  it("фильтрует невалидные rows (object без name / не-object)", () => {
    render(
      <SchemaEditor
        value={[
          { name: "valid", type: "string" },
          null,
          "not-an-object",
          { type: "no-name" },
        ]}
        readOnly
      />
    );
    expect(screen.getByText("valid")).toBeTruthy();
    expect(screen.queryByText("no-name")).toBeNull();
  });

  it("readOnly не рендерит add-button и remove-кнопки", () => {
    render(<SchemaEditor value={sample} readOnly />);
    expect(screen.queryByText(/Add column/)).toBeNull();
    expect(screen.queryByLabelText("Remove column")).toBeNull();
  });
});

describe("SchemaEditor — edit mode", () => {
  it("рендерит rows как inputs", () => {
    const { container } = render(
      <SchemaEditor value={sample} onChange={() => {}} />
    );
    const inputs = container.querySelectorAll("input[type='text']");
    // 3 строки × 2 text-input (name + comment) = 6
    expect(inputs.length).toBe(6);
  });

  it("edit column name → onChange с patched row", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SchemaEditor value={sample} onChange={onChange} />
    );
    const idInput = container.querySelector("input[type='text']");
    fireEvent.change(idInput, { target: { value: "new_id" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next[0].name).toBe("new_id");
    expect(next[0].type).toBe("bigint"); // остальное сохранено
    expect(next[1]).toEqual(sample[1]);   // не тронутые — ссылочно прежние
  });

  it("change type → onChange с новым type", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SchemaEditor value={sample} onChange={onChange} />
    );
    const select = container.querySelector("select");
    fireEvent.change(select, { target: { value: "integer" } });
    expect(onChange.mock.calls[0][0][0].type).toBe("integer");
  });

  it("varchar length input — edit", () => {
    const onChange = vi.fn();
    render(
      <SchemaEditor
        value={[{ name: "email", type: "varchar", length: 100 }]}
        onChange={onChange}
      />
    );
    const input = screen.getByPlaceholderText("length");
    fireEvent.change(input, { target: { value: "255" } });
    expect(onChange.mock.calls[0][0][0].length).toBe(255);
  });

  it("decimal precision/scale — edit", () => {
    const onChange = vi.fn();
    render(
      <SchemaEditor
        value={[{ name: "amount", type: "decimal", precision: 8, scale: 2 }]}
        onChange={onChange}
      />
    );
    const pInput = screen.getByPlaceholderText("p");
    fireEvent.change(pInput, { target: { value: "12" } });
    expect(onChange.mock.calls[0][0][0].precision).toBe(12);
  });

  it("Add column добавляет default row", () => {
    const onChange = vi.fn();
    render(<SchemaEditor value={sample} onChange={onChange} />);
    const addBtn = screen.getByRole("button", { name: /Add column/ });
    fireEvent.click(addBtn);
    const next = onChange.mock.calls[0][0];
    expect(next.length).toBe(sample.length + 1);
    expect(next[next.length - 1]).toEqual({ name: "", type: "string", nullable: true });
  });

  it("Remove column — onChange без row'а", () => {
    const onChange = vi.fn();
    render(<SchemaEditor value={sample} onChange={onChange} />);
    const removeBtns = screen.getAllByLabelText("Remove column");
    fireEvent.click(removeBtns[1]); // удаляем email
    const next = onChange.mock.calls[0][0];
    expect(next.length).toBe(2);
    expect(next.find(r => r.name === "email")).toBeUndefined();
  });
});

describe("SchemaEditor — adapter delegation", () => {
  it("использует adapter component если capability зарегистрирована", () => {
    const AdapterEditor = ({ value }) => (
      <div data-testid="adapter-schema">adapter:{value.length}</div>
    );
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "schemaEditor" ? AdapterEditor : null,
      },
    };
    render(<SchemaEditor value={sample} ctx={ctx} readOnly />);
    expect(screen.getByTestId("adapter-schema").textContent).toBe("adapter:3");
  });
});
