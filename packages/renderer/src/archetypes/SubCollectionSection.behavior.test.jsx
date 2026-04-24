import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import SubCollectionSection from "./SubCollectionSection.jsx";

afterEach(cleanup);

const TARGET = { id: "task-1" };

function ctxWith(responses) {
  return {
    world: { responses },
    viewer: { id: "u1" },
  };
}

describe("SubCollectionSection — sort/where/terminalStatus (backlog §4.7/§4.8)", () => {
  const RESPONSES = [
    { id: "r1", taskId: "task-1", title: "Первый", price: 100, createdAt: "2026-04-18T10:00Z", status: "pending" },
    { id: "r2", taskId: "task-1", title: "Второй", price: 300, createdAt: "2026-04-19T10:00Z", status: "pending" },
    { id: "r3", taskId: "task-1", title: "Третий", price: 200, createdAt: "2026-04-20T10:00Z", status: "withdrawn" },
    { id: "r4", taskId: "task-1", title: "Чужой", price: 50, createdAt: "2026-04-17T10:00Z", status: "pending" },
    // item без fkMatch — должен быть отфильтрован foreignKey'ом
    { id: "r5", taskId: "OTHER", title: "Не наш", price: 999, status: "pending" },
  ];

  it("foreignKey-filter работает, как раньше (no-regression)", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    expect(container.textContent).toContain("Первый");
    expect(container.textContent).toContain("Второй");
    expect(container.textContent).toContain("Третий");
    expect(container.textContent).not.toContain("Не наш");
  });

  it("section.sort='-createdAt' — новые сверху", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      sort: "-createdAt",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    // Третий (2026-04-20) должен идти раньше Второй (2026-04-19) и Первый (2026-04-18).
    const text = container.textContent;
    expect(text.indexOf("Третий")).toBeLessThan(text.indexOf("Второй"));
    expect(text.indexOf("Второй")).toBeLessThan(text.indexOf("Первый"));
  });

  it("section.sort='+price' — дешёвые сверху (без знака тоже ascending)", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      sort: "price",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    const text = container.textContent;
    // price: Первый=100, Третий=200, Второй=300
    expect(text.indexOf("Первый")).toBeLessThan(text.indexOf("Третий"));
    expect(text.indexOf("Третий")).toBeLessThan(text.indexOf("Второй"));
  });

  it("section.where строка — `item.status === 'pending'` скрывает withdrawn", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      where: "item.status === 'pending'",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    expect(container.textContent).toContain("Первый");
    expect(container.textContent).toContain("Второй");
    expect(container.textContent).not.toContain("Третий"); // withdrawn
  });

  it("terminalStatus + hideTerminal — withdrawn скрыт по default, toggle показывает", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      terminalStatus: "status",
      hideTerminal: true,
      toggleTerminalLabel: "Показать все",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    expect(container.textContent).not.toContain("Третий"); // withdrawn — скрыт
    expect(container.textContent).toContain("Показать все");
    // toggle
    fireEvent.click(container.querySelector("button"));
    expect(container.textContent).toContain("Третий");
    expect(container.textContent).toContain("Скрыть завершённые");
  });

  it("terminalStatus без hideTerminal — показывает всё (opacity применяется в item-render отдельно)", () => {
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      terminalStatus: "status",
      hideTerminal: false,
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(RESPONSES)} />
    );
    expect(container.textContent).toContain("Третий");
  });

  it("section пустая после terminal-filter — toggle видим (section не скрыта)", () => {
    const onlyWithdrawn = [
      { id: "r1", taskId: "task-1", title: "Единственный", status: "withdrawn" },
    ];
    const section = {
      title: "Отклики",
      source: "responses",
      foreignKey: "taskId",
      itemView: { type: "text", bind: "title" },
      terminalStatus: "status",
      hideTerminal: true,
    };
    const { container } = render(
      <SubCollectionSection section={section} target={TARGET} ctx={ctxWith(onlyWithdrawn)} />
    );
    // items.length === 0 на default (hideTerminal), но скрытых 1 — toggle должен рендериться
    expect(container.textContent).toContain("Показать все");
    expect(container.textContent).toContain("(+1)");
  });
});

describe("SubCollectionSection — pattern-derived source fallback", () => {
  const POSITIONS = [
    { id: "p1", assetId: "asset-1", label: "Portfolio A" },
    { id: "p2", assetId: "asset-1", label: "Portfolio B" },
    { id: "p3", assetId: "asset-OTHER", label: "Chuzhoy" },
  ];
  const ASSET_TARGET = { id: "asset-1" };

  it("source='derived:<pattern>' + collection='positions' → читает из ctx.world.positions", () => {
    const section = {
      title: "Использование (Position)",
      kind: "reverseM2mBrowse",
      source: "derived:reverse-association-browser",
      collection: "positions",
      itemEntity: "Position",
      foreignKey: "assetId",
      itemView: { type: "text", bind: "label" },
    };
    const ctx = { world: { positions: POSITIONS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={ASSET_TARGET} ctx={ctx} />
    );
    expect(container.textContent).toContain("Portfolio A");
    expect(container.textContent).toContain("Portfolio B");
    expect(container.textContent).not.toContain("Chuzhoy");
  });

  it("source='derived:<pattern>' без collection → pluralization itemEntity (Position → positions)", () => {
    const section = {
      title: "Reverse",
      source: "derived:reverse-association-browser",
      itemEntity: "Position",
      foreignKey: "assetId",
      itemView: { type: "text", bind: "label" },
    };
    const ctx = { world: { positions: POSITIONS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={ASSET_TARGET} ctx={ctx} />
    );
    expect(container.textContent).toContain("Portfolio A");
  });

  it("source — реальный key (не witness) → читает без fallback", () => {
    const section = {
      title: "Direct",
      source: "positions",
      foreignKey: "assetId",
      itemView: { type: "text", bind: "label" },
    };
    const ctx = { world: { positions: POSITIONS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={ASSET_TARGET} ctx={ctx} />
    );
    expect(container.textContent).toContain("Portfolio A");
  });
});

describe("SubCollectionSection — groupBy (polymorphic reverseM2mBrowse)", () => {
  const TAG_TARGET = { id: "tag-pii" };
  const TAG_ASSOCIATIONS = [
    { id: "ta1", tagId: "tag-pii", objectId: "cat-1", objectType: "Catalog", label: "Prod Lake" },
    { id: "ta2", tagId: "tag-pii", objectId: "tbl-1", objectType: "Table", label: "users" },
    { id: "ta3", tagId: "tag-pii", objectId: "tbl-2", objectType: "Table", label: "orders" },
    { id: "ta4", tagId: "tag-pii", objectId: "sch-1", objectType: "Schema", label: "public" },
    { id: "ta5", tagId: "tag-other", objectId: "x", objectType: "Table", label: "chuzhoy" },
    { id: "ta6", tagId: "tag-pii", objectId: "z", objectType: null, label: "unknown" },
  ];
  const baseSection = {
    title: "Tagged objects",
    source: "tagAssociations",
    foreignKey: "tagId",
    groupBy: "objectType",
    itemView: { type: "text", bind: "label" },
  };
  const ctxWithTags = () => ({ world: { tagAssociations: TAG_ASSOCIATIONS }, viewer: { id: "u1" } });

  it("группирует items по groupBy-полю с header + count", () => {
    const { container } = render(
      <SubCollectionSection section={baseSection} target={TAG_TARGET} ctx={ctxWithTags()} />
    );
    const text = container.textContent;
    expect(text).toContain("Catalog (1)");
    expect(text).toContain("Table (2)");
    expect(text).toContain("Schema (1)");
    expect(text).toContain("Prod Lake");
    expect(text).toContain("users");
    expect(text).toContain("orders");
    expect(text).toContain("public");
  });

  it("фильтрует по foreignKey до группировки (чужие items не попадают)", () => {
    const { container } = render(
      <SubCollectionSection section={baseSection} target={TAG_TARGET} ctx={ctxWithTags()} />
    );
    expect(container.textContent).not.toContain("chuzhoy");
  });

  it("null-значения попадают в отдельный bucket с groupNullLabel", () => {
    const section = { ...baseSection, groupNullLabel: "Без типа" };
    const { container } = render(
      <SubCollectionSection section={section} target={TAG_TARGET} ctx={ctxWithTags()} />
    );
    const text = container.textContent;
    expect(text).toContain("Без типа (1)");
    expect(text).toContain("unknown");
  });

  it("без groupBy работает по-старому (flat list, no headers)", () => {
    const flatSection = { ...baseSection, groupBy: undefined };
    const { container } = render(
      <SubCollectionSection section={flatSection} target={TAG_TARGET} ctx={ctxWithTags()} />
    );
    const text = container.textContent;
    expect(text).toContain("Prod Lake");
    expect(text).toContain("users");
    expect(text).not.toContain("Catalog (1)");
    expect(text).not.toContain("Table (2)");
  });
});

describe("SubCollectionSection — renderAs.type=permissionMatrix (P-K-D)", () => {
  const USER_TARGET = { id: "u_alice" };
  const ROLE_MAPPINGS = [
    { id: "rm1", userId: "u_alice", type: "realm",  name: "admin",       privileges: ["manage"], inheritedFrom: "direct" },
    { id: "rm2", userId: "u_alice", type: "realm",  name: "view-users",  privileges: ["view"],   inheritedFrom: "composite:admin" },
    { id: "rm3", userId: "u_alice", type: "client", name: "backend",     privileges: ["invoke"], inheritedFrom: "group:Admins" },
    { id: "rm4", userId: "u_bob",   type: "realm",  name: "x",           privileges: ["x"],      inheritedFrom: "direct" },
  ];
  const section = {
    title: "Role mappings",
    source: "roleMappings",
    foreignKey: "userId",
    renderAs: { type: "permissionMatrix" },
  };

  it("рендерит PermissionMatrix для Alice's 3 записей (Bob отфильтрован)", () => {
    const ctx = { world: { roleMappings: ROLE_MAPPINGS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={USER_TARGET} ctx={ctx} />
    );
    expect(container.textContent).toContain("admin");
    expect(container.textContent).toContain("view-users");
    expect(container.textContent).toContain("backend");
    expect(container.textContent).toContain("через composite");
    expect(container.textContent).toContain("через группу");
    expect(container.textContent).toContain("Role mappings (3)");
  });

  it("пустой items — section не рендерится", () => {
    const ctx = { world: { roleMappings: [] }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={USER_TARGET} ctx={ctx} />
    );
    expect(container.textContent).not.toContain("Role mappings");
  });
});

describe("SubCollectionSection — renderAs.type=credentialEditor (P-K-C)", () => {
  const USER_TARGET = { id: "u_alice" };
  const CREDENTIALS = [
    { id: "cr1", userId: "u_alice", type: "password", userLabel: "Основной",  createdDate: 1700000000000, algorithm: "argon2id" },
    { id: "cr2", userId: "u_alice", type: "otp",      userLabel: "Authy",     createdDate: 1705000000000, algorithm: "SHA-256", digits: 6, period: 30 },
    { id: "cr3", userId: "u_bob",   type: "password", userLabel: "Bob's",     createdDate: 1700000000000, algorithm: "argon2id" },
  ];

  it("рендерит CredentialEditor — Alice видит свои 2 credentials, Bob отфильтрован", () => {
    const section = {
      title: "Credentials",
      source: "credentials",
      foreignKey: "userId",
      renderAs: { type: "credentialEditor" },
    };
    const ctx = { world: { credentials: CREDENTIALS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={USER_TARGET} ctx={ctx} />
    );
    expect(container.textContent).toContain("Основной");
    expect(container.textContent).toContain("Authy");
    expect(container.textContent).not.toContain("Bob's");
    expect(container.textContent).toContain("Credentials (2)");
  });

  it("readOnly=false + actionIntents — onAction exec'ится с intent", () => {
    const exec = vi.fn();
    const section = {
      title: "Credentials",
      source: "credentials",
      foreignKey: "userId",
      renderAs: {
        type: "credentialEditor",
        readOnly: false,
        actionIntents: { rotate: "resetUserPassword", delete: "removeCredential" },
      },
    };
    const ctx = { world: { credentials: CREDENTIALS }, viewer: { id: "u1" }, exec };
    const { container } = render(
      <SubCollectionSection section={section} target={USER_TARGET} ctx={ctx} />
    );
    const rotateBtn = [...container.querySelectorAll("button")]
      .find(b => b.textContent === "Сбросить пароль");
    expect(rotateBtn).toBeTruthy();
    fireEvent.click(rotateBtn);
    expect(exec).toHaveBeenCalledWith(
      "resetUserPassword",
      expect.objectContaining({ credentialId: "cr1" }),
    );
  });

  it("readOnly=true (default) — action buttons hidden", () => {
    const section = {
      title: "Credentials",
      source: "credentials",
      foreignKey: "userId",
      renderAs: { type: "credentialEditor" },
    };
    const ctx = { world: { credentials: CREDENTIALS }, viewer: { id: "u1" } };
    const { container } = render(
      <SubCollectionSection section={section} target={USER_TARGET} ctx={ctx} />
    );
    const labels = [...container.querySelectorAll("button")].map(b => b.textContent);
    expect(labels).not.toContain("Сбросить пароль");
    expect(labels).not.toContain("Удалить");
  });
});
