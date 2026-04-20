import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

/**
 * Regression: List раньше имел useRef/useEffect ПОСЛЕ conditional early-return
 * `if (items.length === 0 && node.empty)`. При переходе empty ↔ non-empty
 * React падал с "Rendered more/fewer hooks than during the previous render".
 * Fix: hooks вызываются безусловно ДО early-return.
 */
describe("List primitive — hooks-order stability (rules-of-hooks regression)", () => {
  it("переход non-empty → empty с node.empty не ломает hooks-order", () => {
    const ctx = {
      world: { items: [{ id: 1 }, { id: 2 }] },
      viewer: { id: "u1" },
    };
    const node = {
      source: "items",
      empty: { type: "text", content: "Пусто" },
    };
    const { rerender, container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).not.toContain("Пусто");

    // Теперь world стал пустым — items.length=0 → должен сработать early-return
    // на empty-state. НЕ должен упасть на hooks-violation.
    rerender(<List node={node} ctx={{ ...ctx, world: { items: [] } }} />);
    expect(container.textContent).toContain("Пусто");
  });

  it("переход empty → non-empty с node.empty тоже не ломает hooks-order", () => {
    const ctx = {
      world: { items: [] },
      viewer: { id: "u1" },
    };
    const node = {
      source: "items",
      empty: { type: "text", content: "Пусто" },
    };
    const { rerender, container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Пусто");

    rerender(<List node={node} ctx={{ ...ctx, world: { items: [{ id: 1 }] } }} />);
    expect(container.textContent).not.toContain("Пусто");
  });

  it("catalog-style empty рендерится без warning'ов при filter'е уводящем всё", () => {
    const ctx = {
      world: { items: [{ id: 1, status: "archived" }, { id: 2, status: "archived" }] },
      viewer: { id: "u1" },
    };
    const node = {
      source: "items",
      filter: "item.status === 'active'",  // всё отфильтровано
      empty: { type: "text", content: "Нет активных" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Нет активных");
  });
});
