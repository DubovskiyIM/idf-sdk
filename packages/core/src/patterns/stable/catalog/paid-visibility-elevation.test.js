import { describe, it, expect } from "vitest";
import pattern from "./paid-visibility-elevation.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("paid-visibility-elevation (merge promotion)", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: catalog + isPromoted boolean", () => {
    const ontology = {
      entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } },
    };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("matches: enum-options содержит \"featured\"", () => {
    const ontology = {
      entities: {
        Task: {
          fields: { id: {}, status: { type: "text", options: ["normal", "featured", "archived"] } },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Task" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: detail projection", () => {
    const ontology = { entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } } };
    const projection = { kind: "detail", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: нет elevation-поля", () => {
    const ontology = { entities: { Tag: { fields: { id: {}, name: { type: "text" } } } } };
    const projection = { kind: "catalog", mainEntity: "Tag" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.elevation=false (opt-out)", () => {
    const ontology = { entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } } };
    const projection = { kind: "catalog", mainEntity: "Listing", elevation: false };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("apply: body.cardSpec.elevation c default placement \"strip\"", () => {
    const ontology = {
      entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } },
    };
    const next = pattern.structure.apply(
      { body: {} },
      { projection: { kind: "catalog", mainEntity: "Listing" }, ontology }
    );
    expect(next.body.cardSpec.elevation).toEqual({
      field: "isPromoted",
      variant: "boolean",
      placement: "strip",
    });
  });

  it("apply: projection.elevationPlacement=\"inline\"", () => {
    const ontology = {
      entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } },
    };
    const next = pattern.structure.apply(
      { body: {} },
      {
        projection: { kind: "catalog", mainEntity: "Listing", elevationPlacement: "inline" },
        ontology,
      }
    );
    expect(next.body.cardSpec.elevation.placement).toBe("inline");
  });

  it("apply idempotent: cardSpec.elevation уже задан", () => {
    const ontology = {
      entities: { Listing: { fields: { id: {}, isPromoted: { type: "boolean" } } } },
    };
    const slots = { body: { cardSpec: { elevation: { field: "authored" } } } };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      ontology,
    });
    expect(next).toBe(slots);
  });
});
