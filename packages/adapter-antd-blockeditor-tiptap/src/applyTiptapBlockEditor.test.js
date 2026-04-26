import { describe, it, expect } from "vitest";
import { applyTiptapBlockEditor, TIPTAP_CAPABILITY } from "./index.js";

describe("applyTiptapBlockEditor", () => {
  it("заменяет primitive.blockEditor на Tiptap component", () => {
    const adapter = {
      name: "antd",
      primitive: { heading: () => null, blockEditor: () => "old" },
      capabilities: { primitive: { blockEditor: { kinds: [], slashCommands: false } } },
    };
    applyTiptapBlockEditor(adapter);
    expect(typeof adapter.primitive.blockEditor).toBe("function");
    // Не сломал другие primitive
    expect(typeof adapter.primitive.heading).toBe("function");
  });

  it("обновляет capabilities.primitive.blockEditor на TIPTAP_CAPABILITY", () => {
    const adapter = {
      primitive: {},
      capabilities: { primitive: { blockEditor: { kinds: [], slashCommands: false } } },
    };
    applyTiptapBlockEditor(adapter);
    expect(adapter.capabilities.primitive.blockEditor).toEqual(TIPTAP_CAPABILITY);
    expect(adapter.capabilities.primitive.blockEditor.inlineFormatting).toBe(true);
    expect(adapter.capabilities.primitive.blockEditor.kinds).toContain("paragraph");
    expect(adapter.capabilities.primitive.blockEditor.kinds).toContain("heading-1");
  });

  it("создаёт capabilities.primitive если их нет", () => {
    const adapter = { primitive: {} };
    applyTiptapBlockEditor(adapter);
    expect(adapter.capabilities.primitive.blockEditor).toBeDefined();
  });

  it("создаёт primitive если его нет", () => {
    const adapter = {};
    applyTiptapBlockEditor(adapter);
    expect(typeof adapter.primitive.blockEditor).toBe("function");
  });

  it("идемпотентно — повторный вызов не ломает", () => {
    const adapter = { primitive: {}, capabilities: {} };
    applyTiptapBlockEditor(adapter);
    const firstFn = adapter.primitive.blockEditor;
    const firstCap = adapter.capabilities.primitive.blockEditor;
    applyTiptapBlockEditor(adapter);
    expect(adapter.primitive.blockEditor).toBe(firstFn);
    expect(adapter.capabilities.primitive.blockEditor).not.toBe(firstCap); // freshly cloned
    expect(adapter.capabilities.primitive.blockEditor).toEqual(firstCap);
  });

  it("кидает TypeError на null/non-object", () => {
    expect(() => applyTiptapBlockEditor(null)).toThrow(TypeError);
    expect(() => applyTiptapBlockEditor("string")).toThrow(TypeError);
  });

  it("TIPTAP_CAPABILITY декларирует ожидаемые flags", () => {
    expect(TIPTAP_CAPABILITY.slashCommands).toBe(false);
    expect(TIPTAP_CAPABILITY.indent).toBe(false);
    expect(TIPTAP_CAPABILITY.dragHandles).toBe(false);
    expect(TIPTAP_CAPABILITY.inlineFormatting).toBe(true);
    expect(Array.isArray(TIPTAP_CAPABILITY.kinds)).toBe(true);
    expect(TIPTAP_CAPABILITY.kinds.length).toBeGreaterThanOrEqual(8);
  });
});
