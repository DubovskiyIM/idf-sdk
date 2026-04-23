import { describe, it, expect, afterEach } from "vitest";
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
