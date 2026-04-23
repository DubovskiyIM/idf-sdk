// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

const ZONES = [
  { id: "zone-1", name: "Центр" },
  { id: "zone-2", name: "Юг" },
];
const DISPATCHERS = [
  { id: "disp-A", name: "Алиса" },
  { id: "disp-B", name: "Борис" },
];
const ASSIGNMENTS = [
  { id: "a1", zoneId: "zone-1", dispatcherId: "disp-A" },
  { id: "a2", zoneId: "zone-1", dispatcherId: "disp-B" },
  { id: "a3", zoneId: "zone-2", dispatcherId: "disp-A" },
];
const ROW_ASSOC = {
  id: "chip_dispatcherassignment",
  junction: "DispatcherAssignment",
  foreignKey: "zoneId",
  otherField: "dispatcherId",
  otherEntity: "Dispatcher",
  attachIntent: "assign_dispatcher_to_zone",
  detachIntent: "unassign_dispatcher_from_zone",
  source: "derived:inline-chip-association",
};

const ITEM = { type: "text", bind: "name" };

function ctxWithChips(overrides = {}) {
  return {
    world: { zones: ZONES, dispatcherAssignments: ASSIGNMENTS, dispatchers: DISPATCHERS },
    viewer: { id: "u1" },
    rowAssociations: [ROW_ASSOC],
    ...overrides,
  };
}

describe("List — rowAssociations в list-layout", () => {
  it("под каждым list-item рендерятся chips из pattern-ассоциаций", () => {
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctxWithChips()} />);
    // Items сами
    expect(container.textContent).toContain("Центр");
    expect(container.textContent).toContain("Юг");
    // Dispatcher-chips (stacked label + имена)
    expect(container.textContent).toContain("Dispatchers");
    expect(container.textContent).toContain("Алиса");
    expect(container.textContent).toContain("Борис");
  });

  it("rowAssociations пусто → list рендерится без chip-блока", () => {
    const node = { type: "list", source: "zones", item: ITEM };
    const ctx = { ...ctxWithChips(), rowAssociations: [] };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Центр");
    expect(container.textContent).not.toContain("Dispatchers");
    expect(container.textContent).not.toContain("Алиса");
  });

  it("detach-chip вызывает ctx.exec(detachIntent)", () => {
    const exec = vi.fn();
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctxWithChips({ exec })} />);
    const detachBtns = container.querySelectorAll("button[aria-label^='Detach']");
    expect(detachBtns.length).toBeGreaterThan(0);
    fireEvent.click(detachBtns[0]);
    expect(exec).toHaveBeenCalledWith(
      "unassign_dispatcher_from_zone",
      expect.objectContaining({ zoneId: expect.any(String) }),
    );
  });

  it("attach-кнопка '+' вызывает ctx.exec(attachIntent)", () => {
    const exec = vi.fn();
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctxWithChips({ exec })} />);
    const addBtns = container.querySelectorAll("button[aria-label^='Add']");
    expect(addBtns.length).toBeGreaterThan(0);
    fireEvent.click(addBtns[0]);
    expect(exec).toHaveBeenCalledWith(
      "assign_dispatcher_to_zone",
      expect.objectContaining({ zoneId: "zone-1" }),
    );
  });
});

describe("List — rowAssociations в grid-layout", () => {
  it("grid-layout (cards) — chips под каждой карточкой", () => {
    const node = {
      type: "list", source: "zones",
      layout: "grid",
      item: ITEM,
    };
    const { container } = render(<List node={node} ctx={ctxWithChips()} />);
    expect(container.textContent).toContain("Центр");
    expect(container.textContent).toContain("Dispatchers");
    expect(container.textContent).toContain("Алиса");
  });
});

describe("List — rowAssociations в kanban-layout", () => {
  it("kanban-layout — chips под каждой карточкой в колонке", () => {
    // kanban нужен columnField — сфабрикуем статусы у items.
    const scopedZones = [
      { id: "zone-1", name: "Центр", status: "active" },
      { id: "zone-2", name: "Юг", status: "draft" },
    ];
    const ctx = {
      world: { zones: scopedZones, dispatcherAssignments: ASSIGNMENTS, dispatchers: DISPATCHERS },
      viewer: { id: "u1" },
      rowAssociations: [ROW_ASSOC],
    };
    const node = {
      type: "list",
      source: "zones",
      layout: {
        type: "kanban",
        columnField: "status",
        columns: [{ id: "active", label: "Active" }, { id: "draft", label: "Draft" }],
      },
      item: ITEM,
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Алиса");
    expect(container.textContent).toContain("Dispatchers");
  });
});

describe("List — attach-picker overlay-aware поведение", () => {
  const OVERLAY = {
    key: "overlay_assign_dispatcher_to_zone",
    type: "customCapture",
    widgetId: "entityPicker",
    targetEntity: "Dispatcher",
    targetCollection: "dispatchers",
    targetAlias: "dispatcher",
    intentId: "assign_dispatcher_to_zone",
  };

  it("при наличии overlay для attachIntent — '+' открывает picker, не exec", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = {
      world: { zones: ZONES, dispatcherAssignments: [], dispatchers: DISPATCHERS },
      viewer: { id: "u1" },
      rowAssociations: [ROW_ASSOC],
      artifact: { slots: { overlay: [OVERLAY] } },
      exec, openOverlay,
    };
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctx} />);
    const addBtns = container.querySelectorAll("button[aria-label^='Add']");
    expect(addBtns.length).toBeGreaterThan(0);
    fireEvent.click(addBtns[0]);
    expect(openOverlay).toHaveBeenCalledWith(
      "overlay_assign_dispatcher_to_zone",
      expect.objectContaining({ item: expect.objectContaining({ id: "zone-1" }) }),
    );
    expect(exec).not.toHaveBeenCalled();
  });

  it("без overlay для attachIntent — '+' exec'ит напрямую (back-compat)", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = {
      world: { zones: ZONES, dispatcherAssignments: [], dispatchers: DISPATCHERS },
      viewer: { id: "u1" },
      rowAssociations: [ROW_ASSOC],
      artifact: { slots: { overlay: [] } },
      exec, openOverlay,
    };
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctx} />);
    fireEvent.click(container.querySelectorAll("button[aria-label^='Add']")[0]);
    expect(openOverlay).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith(
      "assign_dispatcher_to_zone",
      expect.objectContaining({ zoneId: "zone-1" }),
    );
  });

  it("overlay с чужим key не совпадает → exec fallback", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = {
      world: { zones: ZONES, dispatcherAssignments: [], dispatchers: DISPATCHERS },
      viewer: { id: "u1" },
      rowAssociations: [ROW_ASSOC],
      artifact: { slots: { overlay: [{ key: "overlay_some_other_intent", type: "formModal" }] } },
      exec, openOverlay,
    };
    const node = { type: "list", source: "zones", item: ITEM };
    const { container } = render(<List node={node} ctx={ctx} />);
    fireEvent.click(container.querySelectorAll("button[aria-label^='Add']")[0]);
    expect(openOverlay).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalled();
  });
});
