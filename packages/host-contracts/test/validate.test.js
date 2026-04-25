import { describe, it, expect } from "vitest";
import { validateModuleManifest } from "../src/validate.js";

describe("validateModuleManifest", () => {
  const minimalValid = {
    id: "billing",
    basePath: "/billing",
    navSections: [],
    routes: [],
  };

  it("accepts a minimal valid manifest", () => {
    const result = validateModuleManifest(minimalValid);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects non-object input", () => {
    expect(validateModuleManifest(null).ok).toBe(false);
    expect(validateModuleManifest("hello").ok).toBe(false);
    expect(validateModuleManifest([]).ok).toBe(false);
  });

  it("requires id and basePath", () => {
    const r = validateModuleManifest({ id: "", basePath: "", navSections: [], routes: [] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("manifest.id: must be non-empty string");
    expect(r.errors).toContain("manifest.basePath: must be non-empty string");
  });

  it("requires basePath to start with /", () => {
    const r = validateModuleManifest({ ...minimalValid, basePath: "billing" });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("manifest.basePath: must start with '/'");
  });

  it("requires navSections and routes (use [] for empty)", () => {
    const r = validateModuleManifest({ id: "x", basePath: "/x" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("navSections"))).toBe(true);
    expect(r.errors.some((e) => e.includes("routes"))).toBe(true);
  });

  it("validates nav-section item ids are unique within section", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      navSections: [
        {
          id: "main",
          items: [
            { id: "home", label: "Home", path: "/" },
            { id: "home", label: "Other", path: "/other" },
          ],
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("duplicate item id"))).toBe(true);
  });

  it("validates section ids are unique", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      navSections: [
        { id: "main", items: [] },
        { id: "main", items: [] },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("duplicate section id"))).toBe(true);
  });

  it("validates beforeLoad is a function if provided", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      routes: [{ path: "/", beforeLoad: "not-a-fn" }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("beforeLoad"))).toBe(true);
  });

  it("validates command shape (id/label/run)", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      commands: [{ id: "foo", label: "Foo" /* missing run */ }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("commands[0].run"))).toBe(true);
  });

  it("validates header-slot names against canonical enum", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      headerSlots: { "made-up-slot": () => null },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('unknown slot "made-up-slot"'))).toBe(true);
  });

  it("accepts a rich manifest with all optional fields", () => {
    const r = validateModuleManifest({
      id: "pipeline",
      name: "Pipeline",
      basePath: "/pipeline",
      version: "1.0.0",
      navSections: [
        {
          id: "main",
          label: "Main",
          order: 1,
          items: [
            { id: "workflows", label: "Workflows", path: "/workflows", icon: "list" },
            { id: "schedules", label: "Schedules", path: "/schedules" },
          ],
        },
      ],
      routes: [
        { path: "/workflows", beforeLoad: () => {} },
        { path: "/schedules" },
      ],
      commands: [{ id: "new-wf", label: "New workflow", run: () => {} }],
      headerSlots: { primary: () => null, "user-menu": () => null },
      loadingTips: [{ id: "t1", text: "Loading..." }],
      docs: [{ id: "wf-docs", label: "Workflows", href: "https://example.com/docs" }],
    });
    expect(r.ok).toBe(true);
  });

  it("validates nested children in nav items", () => {
    const r = validateModuleManifest({
      ...minimalValid,
      navSections: [
        {
          id: "main",
          items: [
            {
              id: "parent",
              label: "Parent",
              path: "/p",
              children: [{ id: "", label: "broken", path: "/c" }],
            },
          ],
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("children[0].id"))).toBe(true);
  });
});
