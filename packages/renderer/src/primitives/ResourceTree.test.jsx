import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { ResourceTree } from "./ResourceTree.jsx";

afterEach(cleanup);

describe("ResourceTree (backlog §10.4c)", () => {
  it("flat-list — нет parentField, все level 0", () => {
    const items = [
      { kind: "Deployment", name: "api" },
      { kind: "Service", name: "api-svc" },
      { kind: "Pod", name: "api-pod-1" },
    ];
    const { container } = render(<ResourceTree items={items} />);
    const rows = container.querySelectorAll("[data-resource-row]");
    expect(rows.length).toBe(3);
    rows.forEach((r) => expect(r.getAttribute("data-level")).toBe("0"));
  });

  it("kind-icon применяется из DEFAULT_KIND_ICONS (Deployment → 📦)", () => {
    const { container } = render(
      <ResourceTree items={[{ kind: "Deployment", name: "api" }]} />
    );
    expect(container.textContent).toContain("📦");
    // text-transform: uppercase — CSS-only; в DOM kind остаётся исходным
    expect(container.textContent).toContain("Deployment");
    expect(container.textContent).toContain("api");
  });

  it("неизвестный kind → fallback 📄", () => {
    const { container } = render(
      <ResourceTree items={[{ kind: "TotallyCustom", name: "x" }]} />
    );
    expect(container.textContent).toContain("📄");
  });

  it("iconMap override стандартного icon (Deployment → 🦄)", () => {
    const { container } = render(
      <ResourceTree
        items={[{ kind: "Deployment", name: "api" }]}
        iconMap={{ Deployment: "🦄" }}
      />
    );
    expect(container.textContent).toContain("🦄");
    expect(container.textContent).not.toContain("📦");
  });

  it("parentField строит граф — Pod under Deployment получает level 1", () => {
    const items = [
      { kind: "Deployment", name: "api" },
      { kind: "Pod", name: "api-pod-1", ownerName: "api" },
      { kind: "Pod", name: "api-pod-2", ownerName: "api" },
      { kind: "Service", name: "lonely-svc" },
    ];
    const { container } = render(
      <ResourceTree items={items} parentField="ownerName" />
    );
    const rows = container.querySelectorAll("[data-resource-row]");
    const levels = Array.from(rows).map((r) => r.getAttribute("data-level"));
    // depth-first: Deployment(0), Pod(1), Pod(1), Service(0)
    expect(levels).toEqual(["0", "1", "1", "0"]);
  });

  it("levelField — приоритет над parentField", () => {
    const items = [
      { kind: "A", name: "a", level: 2 },
      { kind: "B", name: "b", level: 0 },
    ];
    const { container } = render(
      <ResourceTree
        items={items}
        levelField="level"
        parentField="ownerName"
      />
    );
    const rows = container.querySelectorAll("[data-resource-row]");
    expect(rows[0].getAttribute("data-level")).toBe("2");
    expect(rows[1].getAttribute("data-level")).toBe("0");
  });

  it("badge columns — render по colorMap", () => {
    const items = [
      { kind: "Pod", name: "p", health: "Healthy", sync: "OutOfSync" },
    ];
    const { container } = render(
      <ResourceTree
        items={items}
        badgeColumns={[
          { field: "health", colorMap: { Healthy: "success", Degraded: "danger" } },
          { field: "sync", colorMap: { Synced: "success", OutOfSync: "warning" } },
        ]}
      />
    );
    expect(container.textContent).toContain("Healthy");
    expect(container.textContent).toContain("OutOfSync");
  });

  it("onItemClick — вызывается с item при клике", () => {
    const handler = vi.fn();
    const items = [{ kind: "Pod", name: "p1", id: "pod-1" }];
    const { container } = render(
      <ResourceTree items={items} onItemClick={handler} />
    );
    const row = container.querySelector("[data-resource-row]");
    fireEvent.click(row);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(items[0]);
  });

  it("orphan-cycle (parent ссылается на сущность которой нет) → root", () => {
    const items = [
      { kind: "Pod", name: "orphan", ownerName: "missing-deploy" },
    ];
    const { container } = render(
      <ResourceTree items={items} parentField="ownerName" />
    );
    const rows = container.querySelectorAll("[data-resource-row]");
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute("data-level")).toBe("0");
  });

  it("пустой items → null (не рендерится)", () => {
    const { container } = render(<ResourceTree items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("items без id → синтетический key (smoke: не падает)", () => {
    const items = [
      { kind: "Pod", name: "p1" },
      { kind: "Pod", name: "p2" },
    ];
    const { container } = render(<ResourceTree items={items} />);
    expect(container.querySelectorAll("[data-resource-row]").length).toBe(2);
  });
});
