// @vitest-environment jsdom
//
// G-K-23 (Keycloak dogfood, 2026-04-23): renderer hard-fails при
// validation.errors !== [] показывая red box "Артефакт не валиден".
// Это блокирует UI на любой valid-WITH-warnings артефакт (например,
// unknown control type для нового primitive). Должен быть soft-warn:
// console.warn + render продолжает. Opt-in strict mode через
// `validationStrict` prop сохраняет старое hard-fail поведение.
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ProjectionRendererV2 from "./ProjectionRendererV2.jsx";

afterEach(cleanup);

const validArtifact = {
  projection: "test_list",
  archetype: "catalog",
  mainEntity: "Test",
  slots: {
    header: [], toolbar: [], hero: [],
    body: { type: "list", items: [] },
    context: [], fab: [], overlay: [],
  },
  nav: { outgoing: [], incoming: [] },
};

const invalidArtifact = {
  ...validArtifact,
  slots: {
    ...validArtifact.slots,
    overlay: [
      // Invalid: control type не в KNOWN_PARAMETER_TYPES
      { type: "formModal", key: "k1", intentId: "x",
        parameters: [{ name: "f1", type: "text", control: "checkbox" }] },
    ],
  },
};

describe("G-K-23: validation soft-warn (default), strict-mode opt-in", () => {
  let warnSpy;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("default mode: рендер не блокируется validation errors (no red box)", () => {
    render(<ProjectionRendererV2 artifact={validArtifact} world={{}} exec={() => {}} />);
    // Архетип catalog рендерится — нет red error box (даже если есть
    // validation warnings от incomplete stub artifact)
    expect(screen.queryByText("Артефакт не валиден")).toBeNull();
  });

  it("default mode: артефакт с validation errors — рендер продолжает + console.warn", () => {
    render(<ProjectionRendererV2 artifact={invalidArtifact} world={{}} exec={() => {}} />);
    expect(warnSpy).toHaveBeenCalled();
    const warnArgs = warnSpy.mock.calls[0].join(" ");
    expect(warnArgs).toMatch(/validation|invalid|control type/i);
    // Red error box НЕ должен показываться (soft-warn mode)
    expect(screen.queryByText("Артефакт не валиден")).toBeNull();
  });

  it("validationStrict prop: артефакт с errors — hard-fail (старое поведение)", () => {
    render(<ProjectionRendererV2 artifact={invalidArtifact} world={{}} exec={() => {}} validationStrict={true} />);
    // В strict — red box показывается
    expect(screen.getByText("Артефакт не валиден")).toBeTruthy();
  });
});
