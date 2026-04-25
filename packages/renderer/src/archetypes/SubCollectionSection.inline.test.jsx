import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SubCollectionSection from "./SubCollectionSection.jsx";

afterEach(cleanup);

/**
 * §10.4b — inline-children mode: items резолвятся прямо из target по path,
 * минуя ctx.world и foreignKey-фильтрацию. Используется для K8s
 * status.resources[] / status.conditions[] и подобных audit-log inline массивов.
 */
describe("SubCollectionSection — inlineSource (backlog §10.4b)", () => {
  const APP = {
    id: "app-1",
    name: "guestbook",
    status: {
      resources: [
        { kind: "Deployment", name: "guestbook", health: "Healthy" },
        { kind: "Service", name: "guestbook", health: "Healthy" },
        { kind: "Pod", name: "guestbook-abc", health: "Degraded" },
      ],
      conditions: [
        { type: "SyncError", status: "False", lastTransitionTime: "2026-04-25T08:00Z" },
        { type: "ResourceHealth", status: "True", lastTransitionTime: "2026-04-25T09:00Z" },
      ],
    },
  };

  const ctx = {
    world: {}, // намеренно пустой — inline должен работать без world
    viewer: { id: "u1" },
  };

  it("inlineSource как dot-string — items резолвятся из target.status.resources", () => {
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Resources (3)");
    expect(container.textContent).toContain("guestbook-abc");
  });

  it("inlineSource как массив — equivalent dot-string", () => {
    const section = {
      title: "Resources",
      inlineSource: ["status", "resources"],
      itemView: { type: "text", bind: "name" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Resources (3)");
  });

  it("foreignKey игнорируется когда inlineSource задан", () => {
    const ctxWithDistractor = {
      world: { resources: [{ id: "world-1", appId: "app-1", name: "из-мира" }] },
      viewer: { id: "u1" },
    };
    const section = {
      title: "Resources",
      // эти поля заданы, но должны быть проигнорированы inline-режимом
      source: "resources",
      foreignKey: "appId",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctxWithDistractor} />
    );
    // Должно показывать inline (3), а НЕ из-мира
    expect(container.textContent).toContain("Resources (3)");
    expect(container.textContent).not.toContain("из-мира");
  });

  it("sort работает на inline items (по lastTransitionTime desc)", () => {
    const section = {
      title: "Conditions",
      inlineSource: "status.conditions",
      itemView: { type: "text", bind: "type" },
      sort: "-lastTransitionTime",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    const text = container.textContent;
    // ResourceHealth (09:00) должен идти раньше SyncError (08:00)
    expect(text.indexOf("ResourceHealth")).toBeLessThan(text.indexOf("SyncError"));
  });

  it("where фильтрует inline items — оставить только Healthy", () => {
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" },
      where: { health: "Healthy" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Resources (2)");
    expect(container.textContent).not.toContain("guestbook-abc");
  });

  it("groupBy работает на inline items — bucket по 'kind'", () => {
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" },
      groupBy: "kind",
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("Deployment (1)");
    expect(container.textContent).toContain("Service (1)");
    expect(container.textContent).toContain("Pod (1)");
  });

  it("отсутствующий path — section не рендерится (items=0, не даёт пустого блока)", () => {
    const section = {
      title: "Missing",
      inlineSource: "status.does_not_exist",
      itemView: { type: "text", bind: "name" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toBe("");
  });

  it("target=null — defensive: items=0, секция не падает", () => {
    const section = {
      title: "Resources",
      inlineSource: "status.resources",
      itemView: { type: "text", bind: "name" },
    };
    const { container } = render(
      <SubCollectionSection section={section} target={null} ctx={ctx} />
    );
    expect(container.textContent).toBe("");
  });

  it("inline items без id — стабильные React key через инкремент (smoke: не падает)", () => {
    const section = {
      title: "Conditions",
      inlineSource: "status.conditions",
      itemView: { type: "text", bind: "type" },
    };
    // Без id у items — раньше React выкидывал warning. Render не падает.
    const { container } = render(
      <SubCollectionSection section={section} target={APP} ctx={ctx} />
    );
    expect(container.textContent).toContain("SyncError");
    expect(container.textContent).toContain("ResourceHealth");
  });
});
