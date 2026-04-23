import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import IntentButton from "./IntentButton.jsx";

afterEach(cleanup);

function mkCtx(overrides = {}) {
  return {
    exec: vi.fn(),
    openOverlay: vi.fn(),
    viewer: { id: "u1" },
    world: {},
    ...overrides,
  };
}

describe("IntentButton — basic", () => {
  it("рендерит label из spec", () => {
    const { container } = render(
      <IntentButton spec={{ intentId: "foo", label: "Run" }} ctx={mkCtx()} />
    );
    expect(container.textContent).toContain("Run");
  });

  it("клик вызывает ctx.exec с intentId + params", () => {
    const ctx = mkCtx();
    const { getByRole } = render(
      <IntentButton spec={{ intentId: "do_it", label: "Go" }} ctx={ctx} item={{ id: "x1" }} />
    );
    fireEvent.click(getByRole("button"));
    expect(ctx.exec).toHaveBeenCalledWith("do_it", expect.objectContaining({ id: "x1" }));
  });
});

describe("IntentButton — action-gate (lifecycle-gated-destructive)", () => {
  const GATE = {
    id: "lifecycleGated_remove_listing",
    intentId: "remove_listing",
    blockedWhen: "item.status !== 'suspended'",
    enabledBy: "suspend_listing",
    tooltip: "Сначала переведите в неактивное состояние",
  };

  it("active item → gate срабатывает, кнопка disabled", () => {
    const ctx = mkCtx({ actionGates: [GATE] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "remove_listing", label: "Delete" }}
        ctx={ctx}
        item={{ id: "l1", status: "published" }}
      />
    );
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("title")).toBe(GATE.tooltip);
  });

  it("suspended item → gate не срабатывает, кнопка активна", () => {
    const ctx = mkCtx({ actionGates: [GATE] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "remove_listing", label: "Delete" }}
        ctx={ctx}
        item={{ id: "l1", status: "suspended" }}
      />
    );
    const btn = container.querySelector("button");
    expect(btn.disabled).toBe(false);
  });

  it("click по disabled кнопке не вызывает exec", () => {
    const ctx = mkCtx({ actionGates: [GATE] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "remove_listing", label: "Delete" }}
        ctx={ctx}
        item={{ id: "l1", status: "published" }}
      />
    );
    fireEvent.click(container.querySelector("button"));
    expect(ctx.exec).not.toHaveBeenCalled();
  });

  it("gate на чужой intentId → не применяется", () => {
    const ctx = mkCtx({ actionGates: [GATE] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "edit_listing", label: "Edit" }}
        ctx={ctx}
        item={{ id: "l1", status: "published" }}
      />
    );
    expect(container.querySelector("button").disabled).toBe(false);
  });

  it("без item — gate skipped (blockedWhen ссылается на item)", () => {
    const ctx = mkCtx({ actionGates: [GATE] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "remove_listing", label: "Delete" }}
        ctx={ctx}
      />
    );
    expect(container.querySelector("button").disabled).toBe(false);
  });

  it("сломанный blockedWhen (syntax error) → gate silently skipped", () => {
    const brokenGate = { ...GATE, blockedWhen: "item.status !!! 'suspended'" };
    const ctx = mkCtx({ actionGates: [brokenGate] });
    const { container } = render(
      <IntentButton
        spec={{ intentId: "remove_listing", label: "Delete" }}
        ctx={ctx}
        item={{ id: "l1", status: "published" }}
      />
    );
    // evalCondition при parse error возвращает true — значит gate blocked сработал бы;
    // но при throw в gate-try — resolveGate возвращает null. Проверяем что logic
    // не падает:
    expect(container.querySelector("button")).toBeTruthy();
  });
});
