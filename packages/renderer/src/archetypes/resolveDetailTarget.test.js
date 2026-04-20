import { describe, it, expect } from "vitest";
import { resolveDetailTarget } from "./ArchetypeDetail.jsx";

const viewer = { id: "u1" };

describe("resolveDetailTarget — обычный detail (mainEntity + idParam)", () => {
  const projection = {
    kind: "detail",
    mainEntity: "Task",
    idParam: "taskId",
  };

  it("резолвит по routeParams[idParam]", () => {
    const parentCtx = {
      world: { tasks: [
        { id: "t1", title: "first" },
        { id: "t2", title: "second" },
      ] },
      routeParams: { taskId: "t2" },
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toEqual({ id: "t2", title: "second" });
  });

  it("null когда routeParams отсутствует", () => {
    const parentCtx = {
      world: { tasks: [{ id: "t1" }] },
      routeParams: {},
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toBeNull();
  });

  it("null когда запись не найдена", () => {
    const parentCtx = {
      world: { tasks: [{ id: "t1" }] },
      routeParams: { taskId: "t999" },
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toBeNull();
  });

  it("null без mainEntity", () => {
    expect(resolveDetailTarget({}, { world: {}, viewer })).toBeNull();
  });
});

describe("resolveDetailTarget — R3b singleton detail", () => {
  it('singleton + filter me.id → target через ownerField', () => {
    const projection = {
      kind: "detail",
      mainEntity: "Wallet",
      singleton: true,
      filter: { field: "userId", op: "=", value: "me.id" },
    };
    const parentCtx = {
      world: { wallets: [
        { id: "w1", userId: "u2", balance: 100 },
        { id: "w2", userId: "u1", balance: 250 },
      ] },
      routeParams: {},
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toEqual({
      id: "w2", userId: "u1", balance: 250,
    });
  });

  it("singleton без filter → null (защитно)", () => {
    const projection = { kind: "detail", mainEntity: "Wallet", singleton: true };
    const parentCtx = {
      world: { wallets: [{ id: "w1", userId: "u1" }] },
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toBeNull();
  });

  it("singleton но у viewer ещё нет записи → null (EmptyState)", () => {
    const projection = {
      kind: "detail",
      mainEntity: "Wallet",
      singleton: true,
      filter: { field: "userId", op: "=", value: "me.id" },
    };
    const parentCtx = {
      world: { wallets: [{ id: "w1", userId: "u2" }] }, // чужой кошелёк
      viewer,
    };
    expect(resolveDetailTarget(projection, parentCtx)).toBeNull();
  });

  it("singleton игнорирует routeParams.idParam", () => {
    // У R3b нет idParam вообще. Если host роутер подсунул какой-то id —
    // мы его не читаем (singleton всегда резолвится через filter).
    const projection = {
      kind: "detail",
      mainEntity: "Wallet",
      singleton: true,
      filter: { field: "userId", op: "=", value: "me.id" },
      idParam: "walletId", // даже если есть — игнорируем
    };
    const parentCtx = {
      world: { wallets: [
        { id: "w1", userId: "u1", balance: 999 },
        { id: "w2", userId: "u2", balance: 1 },
      ] },
      routeParams: { walletId: "w2" }, // подсовываем чужой
      viewer,
    };
    // Ожидаем свой wallet, не тот что в routeParams
    expect(resolveDetailTarget(projection, parentCtx).balance).toBe(999);
  });
});
