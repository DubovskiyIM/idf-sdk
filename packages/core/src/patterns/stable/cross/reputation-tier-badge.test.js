import { describe, it, expect } from "vitest";
import pattern from "./reputation-tier-badge.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("reputation-tier-badge (merge promotion)", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: detail + boolean isPro", () => {
    const ontology = {
      entities: { User: { fields: { id: {}, isPro: { type: "boolean" } } } },
    };
    const projection = { kind: "detail", mainEntity: "User" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("matches: catalog + enum tier в options", () => {
    const ontology = {
      entities: {
        Seller: {
          fields: {
            id: {},
            tier: { type: "text", options: ["novice", "specialist", "pro", "master"] },
          },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Seller" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: нет tier-field", () => {
    const ontology = { entities: { Message: { fields: { id: {}, text: { type: "text" } } } } };
    const projection = { kind: "detail", mainEntity: "Message" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.tierBadge=false", () => {
    const ontology = { entities: { User: { fields: { id: {}, isPro: { type: "boolean" } } } } };
    const projection = { kind: "detail", mainEntity: "User", tierBadge: false };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("apply detail: tierBadge в header", () => {
    const ontology = { entities: { User: { fields: { id: {}, isPro: { type: "boolean" } } } } };
    const next = pattern.structure.apply(
      { header: [] },
      { projection: { kind: "detail", mainEntity: "User" }, ontology }
    );
    expect(next.header).toEqual([
      { type: "tierBadge", bind: "isPro", variant: "boolean" },
    ]);
  });

  it("apply detail idempotent: tierBadge уже есть", () => {
    const ontology = { entities: { User: { fields: { id: {}, isPro: { type: "boolean" } } } } };
    const slots = { header: [{ type: "tierBadge", bind: "custom" }] };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "detail", mainEntity: "User" },
      ontology,
    });
    expect(next).toBe(slots);
  });

  it("apply catalog: добавляет в cardSpec.badges", () => {
    const ontology = {
      entities: {
        Seller: {
          fields: {
            id: {},
            tier: { type: "text", options: ["novice", "pro", "master"] },
          },
        },
      },
    };
    const next = pattern.structure.apply(
      { body: { cardSpec: {} } },
      { projection: { kind: "catalog", mainEntity: "Seller" }, ontology }
    );
    expect(next.body.cardSpec.badges).toEqual([
      { bind: "tier", variant: "enum", kind: "tier" },
    ]);
  });

  it("apply catalog idempotent: badge уже есть", () => {
    const ontology = {
      entities: { Seller: { fields: { id: {}, tier: { options: ["pro"] } } } },
    };
    const slots = {
      body: { cardSpec: { badges: [{ bind: "tier", variant: "enum", kind: "tier" }] } },
    };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Seller" },
      ontology,
    });
    expect(next).toBe(slots);
  });
});
