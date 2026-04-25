import { describe, it, expect } from "vitest";
import diffPreview from "./diff-preview-before-irreversible.js";
const { hasStructuredField } = diffPreview._helpers;

const ontologyArgo = {
  entities: {
    Application: {
      fields: {
        id:   { type: "string" },
        name: { type: "string" },
        spec: { type: "object" },
      },
    },
  },
};
const projArgo = { archetype: "detail", mainEntity: "Application" };

const intentsWithIrr = [{ id: "rollback", irreversibility: "high" }];
const intentsWithoutIrr = [{ id: "sync", irreversibility: "low" }];

describe("diff-preview-before-irreversible — trigger.match", () => {
  it("matches: irr=high + structured entity field", () => {
    expect(diffPreview.trigger.match(intentsWithIrr, ontologyArgo, projArgo)).toBe(true);
  });

  it("не matches: нет irreversible intent", () => {
    expect(diffPreview.trigger.match(intentsWithoutIrr, ontologyArgo, projArgo)).toBe(false);
  });

  it("не matches: irreversible intent но entity без structured fields", () => {
    const ont = { entities: { Booking: { fields: { id: { type: "string" }, date: { type: "datetime" } } } } };
    expect(diffPreview.trigger.match(intentsWithIrr, ont, { mainEntity: "Booking" })).toBe(false);
  });

  it("matches: __irr через particles.effects", () => {
    const intents = [{ id: "apply", particles: { effects: [{ context: { __irr: { point: "high" } } }] } }];
    expect(diffPreview.trigger.match(intents, ontologyArgo, projArgo)).toBe(true);
  });

  it("не matches: mainEntity не в ontology", () => {
    expect(diffPreview.trigger.match(intentsWithIrr, ontologyArgo, { mainEntity: "Missing" })).toBe(false);
  });

  it("не matches: yaml/manifest field missing (scalar entity)", () => {
    const ont = { entities: { E: { fields: { status: { type: "string" } } } } };
    expect(diffPreview.trigger.match(intentsWithIrr, ont, { mainEntity: "E" })).toBe(false);
  });
});

describe("diff-preview-before-irreversible — structure.apply", () => {
  it("добавляет diffPreview к confirmDialog overlay", () => {
    const slots = {
      overlays: {
        rollback_confirm: { type: "confirmDialog", intentId: "rollback" },
      },
    };
    const out = diffPreview.structure.apply(slots, { intents: intentsWithIrr, ontology: ontologyArgo, projection: projArgo });
    expect(out.overlays.rollback_confirm.diffPreview).toEqual({ enabled: true });
  });

  it("no-op: diffPreview уже задан", () => {
    const slots = {
      overlays: {
        rollback_confirm: { type: "confirmDialog", intentId: "rollback", diffPreview: { enabled: true } },
      },
    };
    const out = diffPreview.structure.apply(slots, { intents: intentsWithIrr, ontology: ontologyArgo, projection: projArgo });
    expect(out).toBe(slots);
  });

  it("no-op: нет overlays", () => {
    const slots = { body: { type: "fields" } };
    const out = diffPreview.structure.apply(slots, { intents: intentsWithIrr, ontology: ontologyArgo, projection: projArgo });
    expect(out).toBe(slots);
  });

  it("no-op: entity без structured fields", () => {
    const ont = { entities: { E: { fields: { id: { type: "string" } } } } };
    const slots = { overlays: { c: { type: "confirmDialog", intentId: "x" } } };
    const out = diffPreview.structure.apply(slots, { intents: intentsWithIrr, ontology: ont, projection: { mainEntity: "E" } });
    expect(out).toBe(slots);
  });

  it("no-op: overlay не confirmDialog type", () => {
    const slots = { overlays: { form: { type: "formModal", intentId: "rollback" } } };
    const out = diffPreview.structure.apply(slots, { intents: intentsWithIrr, ontology: ontologyArgo, projection: projArgo });
    expect(out).toBe(slots);
  });
});

describe("diff-preview-before-irreversible — helpers", () => {
  it("hasStructuredField: object type → true", () => {
    expect(hasStructuredField({ fields: { spec: { type: "object" } } })).toBe(true);
  });

  it("hasStructuredField: yaml type → true", () => {
    expect(hasStructuredField({ fields: { raw: { type: "yaml" } } })).toBe(true);
  });

  it("hasStructuredField: fieldRole manifest → true", () => {
    expect(hasStructuredField({ fields: { tpl: { type: "string", fieldRole: "manifest" } } })).toBe(true);
  });

  it("hasStructuredField: scalar fields → false", () => {
    expect(hasStructuredField({ fields: { name: { type: "string" }, date: { type: "datetime" } } })).toBe(false);
  });
});
