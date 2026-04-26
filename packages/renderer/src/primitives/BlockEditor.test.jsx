// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import BlockEditor, { BlockEditorFallback, buildHierarchy } from "./BlockEditor.jsx";
import { registerUIAdapter } from "../adapters/registry.js";

afterEach(() => {
  cleanup();
  registerUIAdapter(null);
});

describe("buildHierarchy", () => {
  it("сортирует по order и группирует по parentId", () => {
    const blocks = [
      { id: "c1", parentId: "p1", order: 1, kind: "paragraph", content: "child" },
      { id: "p1", parentId: null, order: 1, kind: "heading-1", content: "root" },
      { id: "p2", parentId: null, order: 0, kind: "paragraph", content: "first" },
    ];
    const tree = buildHierarchy(blocks);
    expect(tree).toHaveLength(2);
    // order 0 → first
    expect(tree[0].id).toBe("p2");
    expect(tree[1].id).toBe("p1");
    expect(tree[1].children).toHaveLength(1);
    expect(tree[1].children[0].id).toBe("c1");
  });

  it("orphan parentId → промоция в roots", () => {
    const blocks = [
      { id: "x", parentId: "missing", order: 0, kind: "paragraph", content: "orphan" },
    ];
    const tree = buildHierarchy(blocks);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("x");
  });

  it("пустой / undefined input → []", () => {
    expect(buildHierarchy(undefined)).toEqual([]);
    expect(buildHierarchy([])).toEqual([]);
  });
});

describe("BlockEditorFallback", () => {
  it("пустой массив → placeholder", () => {
    render(<BlockEditorFallback blocks={[]} />);
    expect(screen.getByText("Блоков нет")).toBeTruthy();
  });

  it("custom placeholder уважается", () => {
    render(<BlockEditorFallback blocks={[]} placeholder="Начните писать" />);
    expect(screen.getByText("Начните писать")).toBeTruthy();
  });

  it("рендерит контент блоков и kind-метку", () => {
    const blocks = [
      { id: "h", parentId: null, order: 0, kind: "heading-1", content: "Заголовок" },
      { id: "p", parentId: null, order: 1, kind: "paragraph", content: "Параграф" },
    ];
    render(<BlockEditorFallback blocks={blocks} />);
    expect(screen.getByText("Заголовок")).toBeTruthy();
    expect(screen.getByText("Параграф")).toBeTruthy();
    expect(screen.getByText("H1")).toBeTruthy();
    expect(screen.getByText("P")).toBeTruthy();
  });

  it("divider рендерится как hr (без content/label)", () => {
    const blocks = [
      { id: "d", parentId: null, order: 0, kind: "divider" },
    ];
    const { container } = render(<BlockEditorFallback blocks={blocks} />);
    expect(container.querySelector("hr")).toBeTruthy();
  });
});

describe("BlockEditor — capability resolution", () => {
  beforeEach(() => {
    registerUIAdapter(null);
  });

  it("без адаптера → fallback", () => {
    const blocks = [{ id: "b", parentId: null, order: 0, kind: "paragraph", content: "hello" }];
    render(<BlockEditor blocks={blocks} />);
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("P")).toBeTruthy();
  });

  it("адаптер без primitive.blockEditor → fallback", () => {
    registerUIAdapter({
      primitive: {},
      capabilities: { primitive: {} },
    });
    const blocks = [{ id: "b", parentId: null, order: 0, kind: "paragraph", content: "world" }];
    render(<BlockEditor blocks={blocks} />);
    expect(screen.getByText("world")).toBeTruthy();
  });

  it("адаптер с primitive.blockEditor → делегирует, передаёт capability в props", () => {
    const calls = [];
    function FakeBlockEditor(props) {
      calls.push(props);
      return <div data-testid="adapted">adapted:{props.blocks.length}</div>;
    }
    registerUIAdapter({
      primitive: { blockEditor: FakeBlockEditor },
      capabilities: {
        primitive: {
          blockEditor: { kinds: ["paragraph", "heading-1"], slashCommands: false },
        },
      },
    });
    const onChange = vi.fn();
    const blocks = [{ id: "b", parentId: null, order: 0, kind: "paragraph", content: "x" }];
    render(<BlockEditor blocks={blocks} onChange={onChange} readOnly={false} />);
    expect(screen.getByTestId("adapted").textContent).toBe("adapted:1");
    expect(calls).toHaveLength(1);
    expect(calls[0].blocks).toBe(blocks);
    expect(calls[0].onChange).toBe(onChange);
    expect(calls[0].readOnly).toBe(false);
    expect(calls[0].capability).toEqual({ kinds: ["paragraph", "heading-1"], slashCommands: false });
  });
});
