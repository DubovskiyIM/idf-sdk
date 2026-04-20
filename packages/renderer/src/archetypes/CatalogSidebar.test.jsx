// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ArchetypeCatalog from "./ArchetypeCatalog.jsx";

afterEach(cleanup);

const emptyBody = { type: "list", source: "tasks", item: null };
const ctx = { world: { tasks: [] }, viewer: { id: "u1" } };

describe("ArchetypeCatalog + sidebar (UI-gap #2)", () => {
  it("без sidebar — aside не рендерится", () => {
    const slots = { header: [], toolbar: [], hero: [], body: emptyBody, sidebar: [], overlay: [] };
    const { container } = render(<ArchetypeCatalog slots={slots} ctx={ctx} />);
    expect(container.querySelector("aside")).toBeNull();
  });

  it("с sidebar — aside рендерится с содержимым", () => {
    const slots = {
      header: [], toolbar: [], hero: [], body: emptyBody, overlay: [],
      sidebar: [
        { type: "heading", content: "Как поручить задание?" },
        { type: "text", content: "Подарите другу" },
      ],
    };
    const { container, getByText } = render(<ArchetypeCatalog slots={slots} ctx={ctx} />);
    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(aside.getAttribute("aria-label")).toBe("Боковая панель");
    expect(getByText("Как поручить задание?")).toBeTruthy();
    expect(getByText("Подарите другу")).toBeTruthy();
  });

  it("sidebar сосуществует с hero и body", () => {
    const slots = {
      header: [], toolbar: [], overlay: [],
      hero: [{ type: "text", content: "HeroContent" }],
      body: emptyBody,
      sidebar: [{ type: "text", content: "SideContent" }],
    };
    const { getByText } = render(<ArchetypeCatalog slots={slots} ctx={ctx} />);
    expect(getByText("HeroContent")).toBeTruthy();
    expect(getByText("SideContent")).toBeTruthy();
  });
});
