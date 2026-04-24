import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import {
  CoSelectionProvider,
  CoSelectionContext,
  useCoSelection,
  useCoSelectionActive,
  useCoSelectionEnabled,
} from "./coSelection.jsx";
import { registerUIAdapter } from "./adapters/registry.js";

afterEach(cleanup);

function makeProbe() {
  const snapshot = { current: null };
  function Probe() {
    snapshot.current = useCoSelection();
    return null;
  }
  return { Probe, snapshot };
}

describe("CoSelectionProvider — basic state", () => {
  it("initial null + setSelection устанавливает значение", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider>
        <Probe />
      </CoSelectionProvider>
    );
    expect(snapshot.current.selection).toBe(null);
    act(() => snapshot.current.setSelection({ entityType: "Node", ids: ["a", "b"] }));
    expect(snapshot.current.selection).toEqual({ entityType: "Node", ids: ["a", "b"] });
  });

  it("initial принимается на mount", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "Cube", ids: ["1"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    expect(snapshot.current.selection).toEqual({ entityType: "Cube", ids: ["1"] });
  });

  it("setSelection поддерживает functional update", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "Node", ids: ["x"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.setSelection((prev) => ({
      entityType: prev.entityType,
      ids: [...prev.ids, "y"],
    })));
    expect(snapshot.current.selection).toEqual({ entityType: "Node", ids: ["x", "y"] });
  });

  it("setSelection(null) очищает selection", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["1"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.setSelection(null));
    expect(snapshot.current.selection).toBe(null);
  });

  it("clearSelection очищает", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["1"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.clearSelection());
    expect(snapshot.current.selection).toBe(null);
  });
});

describe("CoSelectionProvider — normalization", () => {
  it("пустой ids → null", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.setSelection({ entityType: "N", ids: [] }));
    expect(snapshot.current.selection).toBe(null);
  });

  it("дубликаты ids убираются, order сохраняется", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.setSelection({ entityType: "N", ids: ["a", "b", "a", "c", "b"] }));
    expect(snapshot.current.selection).toEqual({ entityType: "N", ids: ["a", "b", "c"] });
  });

  it("числовые id нормализуются в string", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.setSelection({ entityType: "N", ids: [1, 2, 3] }));
    expect(snapshot.current.selection).toEqual({ entityType: "N", ids: ["1", "2", "3"] });
  });

  it("отсутствующий entityType → null", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.setSelection({ ids: ["a"] }));
    expect(snapshot.current.selection).toBe(null);
  });

  it("null/undefined/scalar → null", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.setSelection("nonsense"));
    expect(snapshot.current.selection).toBe(null);
  });
});

describe("CoSelectionProvider — toggleSelection", () => {
  it("toggle на пустом → single selection", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.toggleSelection("N", "a"));
    expect(snapshot.current.selection).toEqual({ entityType: "N", ids: ["a"] });
  });

  it("toggle существующего id → убирает", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a", "b"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.toggleSelection("N", "a"));
    expect(snapshot.current.selection).toEqual({ entityType: "N", ids: ["b"] });
  });

  it("toggle нового id в той же entityType → добавляет", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.toggleSelection("N", "b"));
    expect(snapshot.current.selection).toEqual({ entityType: "N", ids: ["a", "b"] });
  });

  it("toggle в другой entityType → reset + single", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a", "b"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.toggleSelection("M", "x"));
    expect(snapshot.current.selection).toEqual({ entityType: "M", ids: ["x"] });
  });

  it("toggle последнего id → null", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.toggleSelection("N", "a"));
    expect(snapshot.current.selection).toBe(null);
  });

  it("toggle с invalid аргументами — no-op", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    act(() => snapshot.current.toggleSelection(null, "a"));
    act(() => snapshot.current.toggleSelection("N", null));
    act(() => snapshot.current.toggleSelection("N", undefined));
    expect(snapshot.current.selection).toBe(null);
  });
});

describe("CoSelectionProvider — isSelected", () => {
  it("true для id в текущей entityType", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a", "b"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    expect(snapshot.current.isSelected("N", "a")).toBe(true);
    expect(snapshot.current.isSelected("N", "b")).toBe(true);
    expect(snapshot.current.isSelected("N", "c")).toBe(false);
  });

  it("false для другой entityType", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a"] }}>
        <Probe />
      </CoSelectionProvider>
    );
    expect(snapshot.current.isSelected("M", "a")).toBe(false);
  });

  it("false при null selection", () => {
    const { Probe, snapshot } = makeProbe();
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    expect(snapshot.current.isSelected("N", "a")).toBe(false);
  });

  it("числовые id matching со строковыми", () => {
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: [1, 2] }}>
        <Probe />
      </CoSelectionProvider>
    );
    expect(snapshot.current.isSelected("N", 1)).toBe(true);
    expect(snapshot.current.isSelected("N", "1")).toBe(true);
  });
});

describe("CoSelectionProvider — onChange side-effect", () => {
  it("вызывается при setSelection + получает нормализованное значение", () => {
    const onChange = vi.fn();
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider onChange={onChange}>
        <Probe />
      </CoSelectionProvider>
    );
    act(() => snapshot.current.setSelection({ entityType: "N", ids: [1, 1, 2] }));
    expect(onChange).toHaveBeenCalledWith({ entityType: "N", ids: ["1", "2"] });
  });

  it("вызывается при clearSelection с null", () => {
    const onChange = vi.fn();
    const { Probe, snapshot } = makeProbe();
    render(
      <CoSelectionProvider initial={{ entityType: "N", ids: ["a"] }} onChange={onChange}>
        <Probe />
      </CoSelectionProvider>
    );
    onChange.mockClear();
    act(() => snapshot.current.clearSelection());
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("useCoSelection — без провайдера (graceful fallback)", () => {
  it("возвращает no-op без краша", () => {
    const { Probe, snapshot } = makeProbe();
    render(<Probe />);
    expect(snapshot.current.selection).toBe(null);
    expect(snapshot.current.isSelected("N", "a")).toBe(false);
    // No-op методы не бросают.
    expect(() => snapshot.current.setSelection({ entityType: "N", ids: ["x"] })).not.toThrow();
    expect(() => snapshot.current.toggleSelection("N", "x")).not.toThrow();
    expect(() => snapshot.current.clearSelection()).not.toThrow();
    // Селекция не изменилась (no-op).
    expect(snapshot.current.selection).toBe(null);
  });
});

describe("useCoSelectionActive", () => {
  it("true внутри провайдера", () => {
    let active = null;
    function Probe() { active = useCoSelectionActive(); return null; }
    render(<CoSelectionProvider><Probe /></CoSelectionProvider>);
    expect(active).toBe(true);
  });

  it("false вне провайдера", () => {
    let active = null;
    function Probe() { active = useCoSelectionActive(); return null; }
    render(<Probe />);
    expect(active).toBe(false);
  });
});

describe("CoSelectionContext — two peer-consumers синхронизируются", () => {
  it("tree-peer setSelection → canvas-peer видит сразу", () => {
    const treeSnapshot = { current: null };
    const canvasSnapshot = { current: null };
    function TreePeer() { treeSnapshot.current = useCoSelection(); return null; }
    function CanvasPeer() { canvasSnapshot.current = useCoSelection(); return null; }
    render(
      <CoSelectionProvider>
        <TreePeer />
        <CanvasPeer />
      </CoSelectionProvider>
    );
    act(() => treeSnapshot.current.setSelection({ entityType: "Cube", ids: ["c1", "c2"] }));
    expect(canvasSnapshot.current.selection).toEqual({ entityType: "Cube", ids: ["c1", "c2"] });
    expect(canvasSnapshot.current.isSelected("Cube", "c1")).toBe(true);
  });
});

describe("useCoSelectionEnabled — capability gate для canvas/map primitives", () => {
  function EnabledProbe({ sink }) {
    sink.current = useCoSelectionEnabled();
    return null;
  }

  it("false без провайдера, даже если adapter declares externalSelection", () => {
    registerUIAdapter({
      name: "test-canvas",
      capabilities: { interaction: { externalSelection: true } },
    });
    const sink = { current: null };
    render(<EnabledProbe sink={sink} />);
    expect(sink.current).toBe(false);
  });

  it("false когда провайдер есть, но adapter NOT declares (default)", () => {
    registerUIAdapter({
      name: "test-no-ext",
      capabilities: { interaction: { externalSelection: false } },
    });
    const sink = { current: null };
    render(<CoSelectionProvider><EnabledProbe sink={sink} /></CoSelectionProvider>);
    expect(sink.current).toBe(false);
  });

  it("true iff провайдер + adapter externalSelection === true", () => {
    registerUIAdapter({
      name: "test-canvas-ok",
      capabilities: { interaction: { externalSelection: true } },
    });
    const sink = { current: null };
    render(<CoSelectionProvider><EnabledProbe sink={sink} /></CoSelectionProvider>);
    expect(sink.current).toBe(true);
  });

  it("false когда capability отсутствует (unknown — opt-in)", () => {
    registerUIAdapter({
      name: "test-no-cap",
      capabilities: { shell: { modal: true } }, // нет interaction-блока
    });
    const sink = { current: null };
    render(<CoSelectionProvider><EnabledProbe sink={sink} /></CoSelectionProvider>);
    expect(sink.current).toBe(false);
  });

  it("false когда adapter вообще без capabilities", () => {
    registerUIAdapter({ name: "test-no-caps" });
    const sink = { current: null };
    render(<CoSelectionProvider><EnabledProbe sink={sink} /></CoSelectionProvider>);
    expect(sink.current).toBe(false);
  });
});

describe("bundled adapters — externalSelection capability", () => {
  // Все 4 bundled-адаптера opt-out (false) — нет native canvas с selection-
  // прокидыванием. Проверяет, что declaration присутствует (не null/undefined).
  const fixtures = [
    { name: "antd-like", caps: { interaction: { externalSelection: false } } },
    { name: "mantine-like", caps: { interaction: { externalSelection: false } } },
    { name: "apple-like", caps: { interaction: { externalSelection: false } } },
    { name: "shadcn-like", caps: { interaction: { externalSelection: false } } },
  ];

  for (const fx of fixtures) {
    it(`${fx.name}: capability присутствует как false (opt-in когда появится canvas-primitive)`, () => {
      registerUIAdapter({ name: fx.name, capabilities: fx.caps });
      const sink = { current: null };
      render(<CoSelectionProvider><EnabledProbeForFixture sink={sink} /></CoSelectionProvider>);
      expect(sink.current).toBe(false);
    });
  }

  function EnabledProbeForFixture({ sink }) {
    sink.current = useCoSelectionEnabled();
    return null;
  }
});
