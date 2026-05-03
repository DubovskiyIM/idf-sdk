// @vitest-environment jsdom
//
// FormModal field-type dispatch (Phase 3.13 form-derive enhancements):
// - param.control === "color"   → ColorPicker (HTML5 color + hex + refresh)
// - param.control === "keyValue" → KeyValueEditor (key/value pairs)
// - param.type === "color" / "keyValue" — alias-fallback (без явного control)
// - param.type === "object" без values → KeyValueControl (free-form properties)
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FormModal from "./FormModal.jsx";

afterEach(cleanup);

const baseSpec = {
  type: "formModal",
  key: "overlay_createTag",
  intentId: "createTag",
  title: "Создать тег",
};

describe("FormModal field-type dispatch", () => {
  it("param.control:'color' рендерит ColorPicker (color input + hex + refresh)", () => {
    const spec = {
      ...baseSpec,
      parameters: [
        { name: "color", control: "color", default: "#0369a1" },
      ],
    };
    render(<FormModal spec={spec} ctx={{ exec: vi.fn() }} overlayContext={{}} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Color picker")).toBeTruthy();
    expect(screen.getByLabelText("Color hex")).toBeTruthy();
    expect(screen.getByLabelText("Refresh color")).toBeTruthy();
  });

  it("param.type:'color' (alias без control) тоже рендерит ColorPicker", () => {
    const spec = {
      ...baseSpec,
      parameters: [
        { name: "color", type: "color", default: "#16a34a" },
      ],
    };
    render(<FormModal spec={spec} ctx={{ exec: vi.fn() }} overlayContext={{}} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Color picker")).toBeTruthy();
  });

  it("param.control:'keyValue' рендерит KeyValueEditor (+ Add Property button)", () => {
    const spec = {
      ...baseSpec,
      parameters: [
        { name: "properties", control: "keyValue" },
      ],
    };
    render(<FormModal spec={spec} ctx={{ exec: vi.fn() }} overlayContext={{}} onClose={vi.fn()} />);
    expect(screen.getByText("+ Add Property")).toBeTruthy();
  });

  it("param.type:'keyValue' (alias без control) тоже рендерит KeyValueEditor", () => {
    const spec = {
      ...baseSpec,
      parameters: [
        { name: "properties", type: "keyValue" },
      ],
    };
    render(<FormModal spec={spec} ctx={{ exec: vi.fn() }} overlayContext={{}} onClose={vi.fn()} />);
    expect(screen.getByText("+ Add Property")).toBeTruthy();
  });

  it("param.type:'object' без values → free-form KeyValueEditor", () => {
    const spec = {
      ...baseSpec,
      parameters: [
        { name: "properties", type: "object" },
      ],
    };
    render(<FormModal spec={spec} ctx={{ exec: vi.fn() }} overlayContext={{}} onClose={vi.fn()} />);
    expect(screen.getByText("+ Add Property")).toBeTruthy();
  });
});
