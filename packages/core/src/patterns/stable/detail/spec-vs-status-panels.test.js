import { describe, it, expect } from "vitest";
import specVsStatusPanels from "./spec-vs-status-panels.js";
const { detectSpecFields, detectStatusFields } = specVsStatusPanels._helpers;

// ─── Базовые фикстуры ─────────────────────────────────────────────────────────

const ontologyArgoCD = {
  entities: {
    Application: {
      fields: {
        id:                   { type: "string" },
        name:                 { type: "string" },
        targetRevision:       { type: "string" },   // spec-hint
        sourceRef:            { type: "string" },   // spec-hint
        currentRevision:      { type: "string" },   // status-hint
        health:               { type: "string" },   // status-hint
      },
    },
  },
};
const projArgo = { archetype: "detail", mainEntity: "Application" };

const ontologyFlux = {
  entities: {
    Kustomization: {
      fields: {
        id:                   { type: "string" },
        sourceRef:            { type: "string" },   // spec-hint
        path:                 { type: "string" },   // spec-hint
        interval:             { type: "string" },   // spec-hint
        lastAppliedRevision:  { type: "string" },   // status-hint
        conditions:           { type: "array" },    // status-hint
        message:              { type: "string" },   // status-hint
      },
    },
  },
};
const projFlux = { archetype: "detail", mainEntity: "Kustomization" };

// ─── trigger.match ────────────────────────────────────────────────────────────

describe("spec-vs-status-panels — trigger.match", () => {
  it("matches: spec-hint (targetRevision) + status-hint (health)", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyArgoCD, projArgo)).toBe(true);
  });

  it("matches: несколько spec/status полей (Flux Kustomization)", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyFlux, projFlux)).toBe(true);
  });

  it("matches: fieldRole === 'spec' + fieldRole === 'status'", () => {
    const ont = {
      entities: {
        Resource: {
          fields: {
            id:      { type: "string" },
            desired: { type: "object", fieldRole: "spec" },
            actual:  { type: "object", fieldRole: "status" },
          },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "Resource" })).toBe(true);
  });

  it("matches: смешанные сигналы — fieldRole spec + name-hint status", () => {
    const ont = {
      entities: {
        Deployment: {
          fields: {
            id:             { type: "string" },
            template:       { type: "object", fieldRole: "spec" },   // fieldRole
            phase:          { type: "string" },                       // status name-hint
          },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "Deployment" })).toBe(true);
  });

  it("не matches: только spec без status полей", () => {
    const ont = {
      entities: {
        E: {
          fields: {
            id:          { type: "string" },
            targetRevision: { type: "string" },
            name:        { type: "string" },
          },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "E" })).toBe(false);
  });

  it("не matches: только status без spec полей", () => {
    const ont = {
      entities: {
        E: {
          fields: {
            id:      { type: "string" },
            phase:   { type: "string" },
            message: { type: "string" },
          },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "E" })).toBe(false);
  });

  it("не matches: archetype !== detail", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyArgoCD, { archetype: "catalog", mainEntity: "Application" })).toBe(false);
  });

  it("не matches: mainEntity не в ontology", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyFlux, { archetype: "detail", mainEntity: "Missing" })).toBe(false);
  });

  it("не matches: messenger/conversation (нет spec/status полей)", () => {
    const ont = {
      entities: {
        Conversation: {
          fields: {
            id:        { type: "string" },
            title:     { type: "string" },
            createdAt: { type: "datetime" },
            updatedAt: { type: "datetime" },
          },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "Conversation" })).toBe(false);
  });
});

// ─── structure.apply ──────────────────────────────────────────────────────────

describe("spec-vs-status-panels — structure.apply", () => {
  it("выставляет body.layout = 'spec-status-split' + specFields + statusFields", () => {
    const slots = { body: { type: "fields", items: [] } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ontologyFlux, projection: projFlux });
    expect(out.body.layout).toBe("spec-status-split");
    expect(Array.isArray(out.body.specFields)).toBe(true);
    expect(Array.isArray(out.body.statusFields)).toBe(true);
    expect(out.body.specFields.length).toBeGreaterThan(0);
    expect(out.body.statusFields.length).toBeGreaterThan(0);
  });

  it("specFields содержит spec-hint поля, statusFields — status-hint", () => {
    const slots = { body: {} };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ontologyFlux, projection: projFlux });
    expect(out.body.specFields).toContain("sourceRef");
    expect(out.body.specFields).toContain("path");
    expect(out.body.statusFields).toContain("lastAppliedRevision");
    expect(out.body.statusFields).toContain("conditions");
  });

  it("сохраняет остальные поля body без изменений", () => {
    const slots = { body: { type: "fields", source: "applications", custom: 99 } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ontologyArgoCD, projection: projArgo });
    expect(out.body.type).toBe("fields");
    expect(out.body.source).toBe("applications");
    expect(out.body.custom).toBe(99);
  });

  it("no-op: body.layout уже задан (author-override)", () => {
    const slots = { body: { layout: "custom-layout", type: "fields" } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ontologyArgoCD, projection: projArgo });
    expect(out).toBe(slots);
  });

  it("no-op: нет body", () => {
    const out = specVsStatusPanels.structure.apply({}, { ontology: ontologyArgoCD, projection: projArgo });
    expect(out).toEqual({});
  });

  it("no-op: entity не найдена в ontology", () => {
    const slots = { body: { type: "fields" } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ontologyArgoCD, projection: { archetype: "detail", mainEntity: "Unknown" } });
    expect(out).toBe(slots);
  });

  it("idempotency: повторное применение не меняет уже выставленный layout", () => {
    const slots = { body: { type: "fields" } };
    const out1 = specVsStatusPanels.structure.apply(slots, { ontology: ontologyFlux, projection: projFlux });
    const out2 = specVsStatusPanels.structure.apply(out1, { ontology: ontologyFlux, projection: projFlux });
    // second apply — no-op because body.layout уже задан
    expect(out2).toBe(out1);
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────────

describe("spec-vs-status-panels — helpers", () => {
  it("detectSpecFields: имена из spec-словаря", () => {
    const entity = {
      fields: {
        id:             { type: "string" },
        targetRevision: { type: "string" },
        sourceRef:      { type: "string" },
        interval:       { type: "string" },
      },
    };
    const result = detectSpecFields(entity);
    expect(result).toContain("targetRevision");
    expect(result).toContain("sourceRef");
    expect(result).toContain("interval");
    expect(result).not.toContain("id");
  });

  it("detectSpecFields: fieldRole === 'spec' приоритетно", () => {
    const entity = {
      fields: {
        foo: { type: "object", fieldRole: "spec" },
        bar: { type: "string" },
      },
    };
    expect(detectSpecFields(entity)).toContain("foo");
  });

  it("detectStatusFields: имена из status-словаря", () => {
    const entity = {
      fields: {
        id:                  { type: "string" },
        conditions:          { type: "array" },
        lastAppliedRevision: { type: "string" },
        phase:               { type: "string" },
        name:                { type: "string" },
      },
    };
    const result = detectStatusFields(entity);
    expect(result).toContain("conditions");
    expect(result).toContain("lastAppliedRevision");
    expect(result).toContain("phase");
    expect(result).not.toContain("id");
    expect(result).not.toContain("name");
  });

  it("detectStatusFields: fieldRole === 'status' приоритетно", () => {
    const entity = {
      fields: {
        actual: { type: "object", fieldRole: "status" },
        baz:    { type: "string" },
      },
    };
    expect(detectStatusFields(entity)).toContain("actual");
  });

  it("detectSpecFields / detectStatusFields: пустой массив для пустого entity", () => {
    expect(detectSpecFields({ fields: {} })).toEqual([]);
    expect(detectStatusFields({ fields: {} })).toEqual([]);
    expect(detectSpecFields(null)).toEqual([]);
    expect(detectStatusFields(undefined)).toEqual([]);
  });
});
