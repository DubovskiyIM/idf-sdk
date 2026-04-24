// @vitest-environment jsdom
//
// G-K-24 + G-K-25 (Keycloak dogfood, 2026-04-23):
// - DataGrid::resolveItems должен учитывать node.filter (string или
//   object) — раньше просто возвращал ctx.world[source] без filter.
// - ActionCell должен auto-open overlay для intents с
//   confirmation:"form" — раньше делал ctx.exec(intent) напрямую,
//   modal не открывался.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import DataGrid, { resolveItems } from "./DataGrid.jsx";

afterEach(cleanup);

const sampleUsers = [
  { id: "u_admin",  username: "admin",     realmId: "r_master" },
  { id: "u_alice",  username: "alice",     realmId: "r_customer" },
  { id: "u_bob",    username: "bob",       realmId: "r_customer" },
  { id: "u_qa",     username: "qa-bot",    realmId: "r_staging" },
  { id: "u_other",  username: "other",     realmId: undefined },
];

describe("G-K-25: DataGrid::resolveItems применяет node.filter (string)", () => {
  it("без filter — возвращает все items", () => {
    const items = resolveItems({ source: "User" }, { world: { User: sampleUsers } });
    expect(items.length).toBe(5);
  });

  it("string filter `realmId === world.realmId` фильтрует по worldWithRoute", () => {
    const items = resolveItems(
      { source: "User", filter: "realmId === world.realmId" },
      { world: { User: sampleUsers, realmId: "r_master" } }
    );
    expect(items.length).toBe(1);
    expect(items[0].username).toBe("admin");
  });

  it("string filter с OR logic — `!world.realmId || realmId === world.realmId`", () => {
    // Без realmId в world — pass-through (показать всех)
    const passAll = resolveItems(
      { source: "User", filter: "!world.realmId || realmId === world.realmId" },
      { world: { User: sampleUsers } }
    );
    expect(passAll.length).toBe(5);

    // С realmId — отфильтровать
    const scoped = resolveItems(
      { source: "User", filter: "!world.realmId || realmId === world.realmId" },
      { world: { User: sampleUsers, realmId: "r_customer" } }
    );
    expect(scoped.length).toBe(2);
    expect(scoped.map(u => u.username).sort()).toEqual(["alice", "bob"]);
  });

  it("filter обернут в try/catch — broken expr → return all (permissive)", () => {
    const items = resolveItems(
      { source: "User", filter: "this.is.not.valid.js" },
      { world: { User: sampleUsers } }
    );
    expect(items.length).toBe(5); // permissive fallback
  });

  it("explicit items array overrides source — filter применяется к items", () => {
    const items = resolveItems(
      { items: sampleUsers, filter: "realmId === 'r_staging'" },
      { world: {} }
    );
    expect(items.length).toBe(1);
    expect(items[0].username).toBe("qa-bot");
  });
});

describe("G-K-24: ActionCell auto-openOverlay для form-confirmation intents", () => {
  const formIntent = {
    name: "Update user",
    confirmation: "form",
    parameters: { id: { type: "text" }, name: { type: "text" } },
  };
  const clickIntent = {
    name: "Logout",
    confirmation: "click",
    parameters: { id: { type: "text" } },
  };

  it("intent с confirmation:'form' → openOverlay (НЕ exec)", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = { exec, openOverlay, intents: { updateUser: formIntent } };

    const grid = {
      type: "dataGrid",
      items: [{ id: "u1", username: "test" }],
      columns: [
        { key: "username" },
        {
          key: "_actions", kind: "actions", display: "inline",
          actions: [{ intent: "updateUser", label: "Edit" }],
        },
      ],
    };
    render(<DataGrid node={grid} ctx={ctx} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(openOverlay).toHaveBeenCalledWith("overlay_updateUser", { item: expect.objectContaining({ id: "u1" }) });
    expect(exec).not.toHaveBeenCalled();
  });

  it("intent с confirmation:'click' → exec (НЕ overlay)", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = { exec, openOverlay, intents: { logoutUser: clickIntent } };

    const grid = {
      type: "dataGrid",
      items: [{ id: "u1", username: "test" }],
      columns: [
        { key: "username" },
        {
          key: "_actions", kind: "actions", display: "inline",
          actions: [{ intent: "logoutUser", label: "Logout", params: { id: "item.id" } }],
        },
      ],
    };
    render(<DataGrid node={grid} ctx={ctx} />);
    fireEvent.click(screen.getByText("Logout"));
    expect(exec).toHaveBeenCalledWith("logoutUser", { id: "u1" });
    expect(openOverlay).not.toHaveBeenCalled();
  });

  it("без ctx.intents — fallback на exec (backward-compat)", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = { exec, openOverlay };

    const grid = {
      type: "dataGrid",
      items: [{ id: "u1" }],
      columns: [
        { key: "_actions", kind: "actions", display: "inline",
          actions: [{ intent: "anything", label: "Do" }],
        },
      ],
    };
    render(<DataGrid node={grid} ctx={ctx} />);
    fireEvent.click(screen.getByText("Do"));
    expect(exec).toHaveBeenCalled();
    expect(openOverlay).not.toHaveBeenCalled();
  });

  it("explicit action.opens:'overlay' — берёт верх (явный override)", () => {
    const exec = vi.fn();
    const openOverlay = vi.fn();
    const ctx = { exec, openOverlay, intents: { logoutUser: clickIntent } };

    const grid = {
      type: "dataGrid",
      items: [{ id: "u1" }],
      columns: [
        { key: "_actions", kind: "actions", display: "inline",
          actions: [{
            intent: "logoutUser",
            label: "Edit",
            opens: "overlay",
            overlayKey: "overlay_custom",
          }],
        },
      ],
    };
    render(<DataGrid node={grid} ctx={ctx} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(openOverlay).toHaveBeenCalledWith("overlay_custom", { item: expect.objectContaining({ id: "u1" }) });
    expect(exec).not.toHaveBeenCalled();
  });
});

describe("ActionCell фильтрует actions по per-row conditions", () => {
  const orders = [
    { id: "o1", status: "pending" },
    { id: "o2", status: "paid" },
    { id: "o3", status: "shipped" },
  ];

  function buildGrid(actions, items = orders) {
    return {
      type: "dataGrid",
      items,
      columns: [
        { key: "id" },
        { key: "_actions", kind: "actions", display: "inline", actions },
      ],
    };
  }

  it("conditions.every true — action виден", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [{
      intent: "pay_order",
      label: "Оплатить",
      conditions: ["order.status = 'pending'"],
    }];
    render(<DataGrid node={buildGrid(actions, [orders[0]])} ctx={ctx} />);
    expect(screen.queryByText("Оплатить")).toBeTruthy();
  });

  it("conditions.every false — action скрыт", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [{
      intent: "pay_order",
      label: "Оплатить",
      conditions: ["order.status = 'pending'"],
    }];
    render(<DataGrid node={buildGrid(actions, [orders[1]])} ctx={ctx} />);
    expect(screen.queryByText("Оплатить")).toBeNull();
  });

  it("conditions пустой/отсутствует — action всегда виден (backward-compat)", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [
      { intent: "view_order", label: "Открыть" },
      { intent: "note", label: "Note", conditions: [] },
    ];
    render(<DataGrid node={buildGrid(actions, [orders[1]])} ctx={ctx} />);
    expect(screen.queryByText("Открыть")).toBeTruthy();
    expect(screen.queryByText("Note")).toBeTruthy();
  });

  it("несколько conditions — all-must-pass (AND logic)", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [{
      intent: "pay_order",
      label: "Оплатить",
      conditions: ["order.status = 'pending'", "order.id != 'o2'"],
    }];
    // первый row пройдёт оба условия
    render(<DataGrid node={buildGrid(actions, [orders[0]])} ctx={ctx} />);
    expect(screen.queryByText("Оплатить")).toBeTruthy();
  });

  it("mixed actions: один виден, другой скрыт — разные conditions", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [
      { intent: "pay",  label: "Оплатить", conditions: ["order.status = 'pending'"] },
      { intent: "ship", label: "Отправить", conditions: ["order.status = 'paid'"] },
    ];
    // paid заказ: «Отправить» виден, «Оплатить» скрыт
    render(<DataGrid node={buildGrid(actions, [orders[1]])} ctx={ctx} />);
    expect(screen.queryByText("Оплатить")).toBeNull();
    expect(screen.queryByText("Отправить")).toBeTruthy();
  });

  it("все actions отфильтрованы — рендерит fallback dash", () => {
    const ctx = { exec: vi.fn(), viewer: { id: "u1" } };
    const actions = [{
      intent: "pay",
      label: "Оплатить",
      conditions: ["order.status = 'shipped'"],  // false для pending-row
    }];
    render(<DataGrid node={buildGrid(actions, [orders[0]])} ctx={ctx} />);
    expect(screen.queryByText("Оплатить")).toBeNull();
    expect(screen.queryByText("—")).toBeTruthy();
  });
});
