// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { List } from "./containers.jsx";

afterEach(cleanup);

describe("GridCard — cardSpec.variants dispatch (v0.15)", () => {
  it("item.kind='bug' → bug-variant badge; item.kind='story' → story-variant metric", () => {
    const node = {
      type: "list",
      source: "tasks",
      gap: 8,
      empty: { type: "text", content: "Пусто" },
      layout: "grid",
      cardSpec: {
        discriminator: "kind",
        variants: {
          bug:   { title: { bind: "title" }, badge: { bind: "severity" } },
          story: { title: { bind: "title" }, metrics: [{ bind: "storyPoints", label: "Points" }] },
        },
      },
      item: { type: "card", children: [] },
    };
    const ctx = {
      world: { tasks: [
        { id: "t1", kind: "bug",   title: "Fix login", severity: "high" },
        { id: "t2", kind: "story", title: "Add profile", storyPoints: 5 },
      ] },
      viewer: { id: "u1" },
    };

    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Fix login");
    expect(container.textContent).toContain("high");
    expect(container.textContent).toContain("Add profile");
    expect(container.textContent).toContain("Points");
    expect(container.textContent).toContain("5");
  });

  it("cardSpec без variants — legacy path неизменен", () => {
    const node = {
      type: "list",
      source: "items",
      gap: 8,
      empty: { type: "text", content: "Пусто" },
      layout: "grid",
      cardSpec: {
        title: { bind: "title" },
        badge: { bind: "status" },
      },
      item: { type: "card", children: [] },
    };
    const ctx = {
      world: { items: [{ id: "i1", title: "Item 1", status: "active" }] },
      viewer: { id: "u1" },
    };
    const { container } = render(<List node={node} ctx={ctx} />);
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("active");
  });
});
