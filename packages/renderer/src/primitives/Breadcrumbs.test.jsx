// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Breadcrumbs from "./Breadcrumbs.jsx";

afterEach(cleanup);

describe("Breadcrumbs primitive", () => {
  it("пустой items → null", () => {
    const { container } = render(<Breadcrumbs node={{ type: "breadcrumbs", items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it("3-item chain — последний current (implicit), первые два link", () => {
    render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [
            { label: "Metalakes", projection: "metalake_list" },
            { label: "prod", projection: "metalake_detail", params: { metalakeId: "m1" } },
            { label: "Catalog", projection: "catalog_detail", params: { catalogId: "c1" } },
          ],
        }}
      />
    );
    // Первые 2 — кнопки
    expect(screen.getByRole("button", { name: "Metalakes" })).toBeDefined();
    expect(screen.getByRole("button", { name: "prod" })).toBeDefined();
    // Последний — current span (не кнопка)
    expect(screen.queryByRole("button", { name: "Catalog" })).toBeNull();
    const current = screen.getByText("Catalog");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("explicit current posiion — помечает не-последний элемент", () => {
    render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [
            { label: "Root", projection: "root_list" },
            { label: "Middle", projection: "middle_detail", current: true },
            { label: "Child", projection: "child_detail" },
          ],
        }}
      />
    );
    expect(screen.queryByRole("button", { name: "Middle" })).toBeNull();
    expect(screen.getByText("Middle").getAttribute("aria-current")).toBe("page");
    // Child тут link (current: false implicit)
    expect(screen.getByRole("button", { name: "Child" })).toBeDefined();
  });

  it("click на link вызывает ctx.navigate", () => {
    const calls = [];
    const ctx = { navigate: (...args) => calls.push(args) };
    render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [
            { label: "Metalakes", projection: "metalake_list" },
            { label: "prod", projection: "metalake_detail", params: { metalakeId: "m1" } },
          ],
        }}
        ctx={ctx}
      />
    );
    screen.getByRole("button", { name: "Metalakes" }).click();
    expect(calls).toEqual([["metalake_list", {}]]);

    calls.length = 0;
    // 'prod' теперь current (последний), click не должен делать navigate
    // (нет button — скипаем)
  });

  it("custom separator", () => {
    render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [
            { label: "A", projection: "a_list" },
            { label: "B", projection: "b_detail" },
          ],
          separator: "/",
        }}
      />
    );
    expect(screen.getByText("/", { selector: "span" })).toBeDefined();
  });

  it("delegation к адаптеру если capability зарегистрирована", () => {
    const AdapterBreadcrumbs = ({ node }) => (
      <div data-testid="adapter-breadcrumbs">adapter:{node.items.length}</div>
    );
    const ctx = {
      adapter: { getComponent: (kind, type) => (kind === "primitive" && type === "breadcrumbs" ? AdapterBreadcrumbs : null) },
      navigate: () => true,
    };
    render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [{ label: "A" }, { label: "B" }],
        }}
        ctx={ctx}
      />
    );
    expect(screen.getByTestId("adapter-breadcrumbs").textContent).toBe("adapter:2");
    // SVG-fallback не отрендерился
    expect(screen.queryByRole("navigation", { name: "Breadcrumbs" })).toBeNull();
  });

  it("a11y: nav с aria-label, ol-список, aria-current на current", () => {
    const { container } = render(
      <Breadcrumbs
        node={{
          type: "breadcrumbs",
          items: [
            { label: "A", projection: "a" },
            { label: "B", projection: "b" },
          ],
        }}
      />
    );
    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Breadcrumbs");
    expect(nav?.querySelector("ol")).toBeTruthy();
    expect(container.querySelector("[aria-current='page']")).toBeTruthy();
  });
});
