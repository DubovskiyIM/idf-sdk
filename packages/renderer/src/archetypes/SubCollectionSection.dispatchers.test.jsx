import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import SubCollectionSection from "./SubCollectionSection.jsx";

afterEach(cleanup);

/**
 * §10.4c — renderAs dispatchers: resourceTree + conditionsTimeline.
 * Тестим интеграцию SubCollectionSection с новыми primitive'ами через
 * renderAs.type, в combo с inlineSource (§10.4b).
 */
describe("SubCollectionSection — renderAs.type='resourceTree' (§10.4c)", () => {
  const APP = {
    id: "app-1",
    status: {
      resources: [
        { kind: "Deployment", name: "api", health: "Healthy", sync: "Synced" },
        { kind: "Pod", name: "api-pod-1", ownerName: "api", health: "Degraded", sync: "Synced" },
        { kind: "Pod", name: "api-pod-2", ownerName: "api", health: "Healthy", sync: "Synced" },
        { kind: "Service", name: "api-svc", health: "Healthy", sync: "Synced" },
      ],
    },
  };
  const ctx = { world: {}, viewer: { id: "u1" } };

  it("inline-source + resourceTree → tree-list с indent + badges", () => {
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" }, // ignored — dispatcher хеджит
      renderAs: {
        type: "resourceTree",
        nameField: "name",
        kindField: "kind",
        parentField: "ownerName",
        badgeColumns: [
          { field: "health", colorMap: { Healthy: "success", Degraded: "danger" } },
          { field: "sync", colorMap: { Synced: "success", OutOfSync: "warning" } },
        ],
      },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Resources");
    // Все 4 ресурса
    expect(container.querySelectorAll("[data-resource-row]").length).toBe(4);
    // Pods под Deployment
    const rows = container.querySelectorAll("[data-resource-row]");
    const podRow = Array.from(rows).find((r) => r.textContent.includes("api-pod-1"));
    expect(podRow.getAttribute("data-level")).toBe("1");
  });

  it("intentOnClick — dispatcher вызывает ctx.exec(intent, { id })", () => {
    const exec = vi.fn();
    const ctxWithExec = { world: {}, viewer: { id: "u1" }, exec };
    const items = [
      { id: "res-1", kind: "Pod", name: "p1" },
    ];
    const APP_LOCAL = { id: "app-1", status: { resources: items } };
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      renderAs: {
        type: "resourceTree",
        intentOnClick: "open_resource",
      },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP_LOCAL} ctx={ctxWithExec} />
    );
    const row = container.querySelector("[data-resource-row]");
    fireEvent.click(row);
    expect(exec).toHaveBeenCalledWith("open_resource", { id: "res-1" });
  });

  it("items=0 (нет resources) — секция не рендерится", () => {
    const APP_EMPTY = { id: "x", status: { resources: [] } };
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      renderAs: { type: "resourceTree" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP_EMPTY} ctx={ctx} />
    );
    expect(container.textContent).toBe("");
  });
});

describe("SubCollectionSection — renderAs.type='conditionsTimeline' (§10.4c)", () => {
  const APP = {
    id: "app-1",
    status: {
      conditions: [
        {
          type: "SyncError",
          status: "False",
          message: "manifest mismatch",
          lastTransitionTime: "2026-04-25T08:00Z",
        },
        {
          type: "ResourceHealth",
          status: "True",
          message: "all green",
          lastTransitionTime: "2026-04-25T09:00Z",
        },
      ],
    },
  };
  const ctx = { world: {}, viewer: { id: "u1" } };

  it("conditionsTimeline → snapshot-rows с at + state-fields", () => {
    const section = {
      title: "Conditions",
      inlineSource: "status.conditions",
      renderAs: {
        type: "conditionsTimeline",
      },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Conditions");
    const rows = container.querySelectorAll('[data-timeline-row="snapshot"]');
    expect(rows.length).toBe(2);
    // дефолтные stateFields = ["type", "status", "message"]
    expect(container.textContent).toContain("SyncError");
    expect(container.textContent).toContain("manifest mismatch");
    expect(container.textContent).toContain("ResourceHealth");
  });

  it("dotColorBy — severity colour для dot", () => {
    const section = {
      title: "Conditions",
      inlineSource: "status.conditions",
      renderAs: {
        type: "conditionsTimeline",
        dotColorBy: {
          field: "type",
          colorMap: { SyncError: "danger", ResourceHealth: "success" },
        },
      },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    const rows = container.querySelectorAll('[data-timeline-row="snapshot"]');
    const colors = Array.from(rows).map((r) =>
      r.querySelector("[data-dot-color]").getAttribute("data-dot-color")
    );
    // SyncError → danger #ef4444, ResourceHealth → success #22c55e
    expect(colors[0]).toBe("#ef4444");
    expect(colors[1]).toBe("#22c55e");
  });

  it("custom atField + stateFields — overrides", () => {
    const APP_CUSTOM = {
      id: "app",
      events: [
        { phase: "Init", level: "info", happenedAt: "2026-04-25T08:00Z" },
      ],
    };
    const section = {
      title: "Events",
      inlineSource: "events",
      renderAs: {
        type: "conditionsTimeline",
        atField: "happenedAt",
        stateFields: ["phase", "level"],
      },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP_CUSTOM} ctx={ctx} />
    );
    expect(container.textContent).toContain("Init");
    expect(container.textContent).toContain("info");
  });

  it("items=0 — секция не рендерится", () => {
    const APP_EMPTY = { id: "x", status: { conditions: [] } };
    const section = {
      title: "Conditions",
      inlineSource: "status.conditions",
      renderAs: { type: "conditionsTimeline" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP_EMPTY} ctx={ctx} />
    );
    expect(container.textContent).toBe("");
  });
});
