// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ProjectionRendererV2 from "./ProjectionRendererV2.jsx";

afterEach(cleanup);

function makeArtifact() {
  return {
    projection: "tasks_list",
    name: "Задачи",
    domain: "test",
    layer: "canonical",
    archetype: "catalog",
    slots: {
      header: [], toolbar: [],
      body: { type: "list", source: "tasks", gap: 8, empty: { type: "text", content: "Пусто" } },
      context: [], fab: [], overlay: [],
    },
    version: 2,
    generatedAt: Date.now(),
    generatedBy: "rules",
    inputsHash: "abc",
    nav: { outgoing: [], incoming: [] },
    views: [
      {
        id: "board",
        name: "Доска",
        archetype: "catalog",
        slots: {
          header: [], toolbar: [],
          body: { type: "list", source: "tasks", gap: 8, empty: { type: "text", content: "Пусто-доска" } },
          context: [], fab: [], overlay: [],
        },
      },
      {
        id: "stats",
        name: "Сводка",
        archetype: "dashboard",
        slots: {
          header: [], toolbar: [],
          body: { type: "dashboard", widgets: [] },
          context: [], fab: [], overlay: [],
        },
      },
    ],
    defaultView: "board",
    viewSwitcher: {
      views: [
        { id: "board", name: "Доска", archetype: "catalog" },
        { id: "stats", name: "Сводка", archetype: "dashboard" },
      ],
      activeId: "board",
    },
  };
}

describe("ProjectionRendererV2 — views swap", () => {
  it("activeView == null — рендерит top-level slots (default view)", () => {
    const art = makeArtifact();
    const { container } = render(<ProjectionRendererV2 artifact={art} world={{}} exec={() => {}} />);
    // top-level slots (default=board) использует source=tasks и content=Пусто
    expect(container.innerHTML).toContain("Пусто");
  });

  it("activeView === defaultView — эквивалентно null (та же top-level ветка)", () => {
    const art = makeArtifact();
    const { container } = render(
      <ProjectionRendererV2 artifact={art} activeView="board" world={{}} exec={() => {}} />
    );
    expect(container.innerHTML).toContain("Пусто");
  });

  it("activeView === 'stats' — подменяет archetype на dashboard", () => {
    const art = makeArtifact();
    const { container } = render(
      <ProjectionRendererV2 artifact={art} activeView="stats" world={{}} exec={() => {}} />
    );
    // dashboard archetype рендерит widgets — top-level "Пусто" из catalog нет
    expect(container.innerHTML).not.toContain("Пусто-доска");
  });

  it("activeView на несуществующую view — fallback на baseArtifact (default)", () => {
    const art = makeArtifact();
    const { container } = render(
      <ProjectionRendererV2 artifact={art} activeView="nonexistent" world={{}} exec={() => {}} />
    );
    expect(container.innerHTML).toContain("Пусто");
  });
});
