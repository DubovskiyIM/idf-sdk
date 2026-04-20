import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog.jsx";

afterEach(cleanup);

function baseCtx() {
  return {
    world: {},
    exec: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ConfirmDialog — irreversibility + confirmLabel", () => {
  it("spec.confirmLabel явно используется как текст кнопки", () => {
    render(
      <ConfirmDialog
        spec={{ message: "Подтвердить сделку?", confirmLabel: "Подтвердить", triggerIntentId: "confirm_deal" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeTruthy();
  });

  it("default: для α='add' / α='replace' → 'Подтвердить' (не 'Удалить')", () => {
    render(
      <ConfirmDialog
        spec={{ message: "Подтвердить?", α: "add", triggerIntentId: "confirm_deal" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Удалить" })).toBeNull();
  });

  it("α='remove' → default label остаётся 'Удалить'", () => {
    render(
      <ConfirmDialog
        spec={{ message: "Снести?", α: "remove", triggerIntentId: "delete_task" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Удалить" })).toBeTruthy();
  });

  it("spec.danger=true форсит destructive tone + 'Удалить'", () => {
    render(
      <ConfirmDialog
        spec={{ message: "Cancel?", α: "replace", danger: true, triggerIntentId: "cancel" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Удалить" })).toBeTruthy();
  });

  it("spec.irreversibility='high' + spec.__irr.reason → рендерит warning panel", () => {
    render(
      <ConfirmDialog
        spec={{
          message: "Подтвердить сделку?",
          irreversibility: "high",
          __irr: { point: "high", reason: "Сумма резервируется в escrow" },
          triggerIntentId: "confirm_deal",
        }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Необратимое действие/i)).toBeTruthy();
    expect(screen.getByText(/Сумма резервируется в escrow/i)).toBeTruthy();
  });

  it("без irreversibility — warning panel НЕ рендерится", () => {
    render(
      <ConfirmDialog
        spec={{ message: "OK?", triggerIntentId: "x" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText(/Необратимое действие/i)).toBeNull();
  });

  it("item.__irr.at (confirmed high-irr effect) — warning panel виден", () => {
    render(
      <ConfirmDialog
        spec={{ message: "Ещё раз?", triggerIntentId: "x" }}
        ctx={baseCtx()}
        overlayContext={{
          item: { id: 1, __irr: { point: "high", at: "2026-04-20T10:00:00Z", reason: "Уже списано" } },
        }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Необратимое действие/i)).toBeTruthy();
    expect(screen.getByText(/Уже списано/i)).toBeTruthy();
  });

  it("irreversibility='high' без reason — показывает только 'Необратимое действие'", () => {
    render(
      <ConfirmDialog
        spec={{ irreversibility: "high", message: "X?", triggerIntentId: "y" }}
        ctx={baseCtx()}
        overlayContext={{ item: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Необратимое действие/i)).toBeTruthy();
  });

  it("клик 'Подтвердить' вызывает ctx.exec с triggerIntentId", async () => {
    const ctx = baseCtx();
    render(
      <ConfirmDialog
        spec={{ message: "?", triggerIntentId: "accept_result", confirmLabel: "Принять" }}
        ctx={ctx}
        overlayContext={{ item: { id: "deal-1" } }}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Принять" }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ctx.exec).toHaveBeenCalledWith("accept_result", { id: "deal-1", entity: { id: "deal-1" } });
  });
});
