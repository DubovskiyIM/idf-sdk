import { describe, it, expect } from "vitest";
import specVsStatusPanels from "./spec-vs-status-panels.js";
const { detectSpecStatusFields } = specVsStatusPanels._helpers;

const ontologyFlux = {
  entities: {
    Kustomization: {
      fields: {
        id:     { type: "string" },
        spec:   { type: "object" },
        status: { type: "object" },
      },
    },
  },
};
const projFlux = { archetype: "detail", mainEntity: "Kustomization" };

describe("spec-vs-status-panels — trigger.match", () => {
  it("matches: convention spec + status fields", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyFlux, projFlux)).toBe(true);
  });

  it("matches: author groups с kind spec + status", () => {
    const ont = {
      entities: {
        App: {
          fields: { id: { type: "string" }, cfg: { type: "object" }, obs: { type: "object" } },
          groups: [
            { kind: "spec", field: "cfg" },
            { kind: "status", field: "obs" },
          ],
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "App" })).toBe(true);
  });

  it("matches: desired/observed group kinds", () => {
    const ont = {
      entities: {
        HelmRelease: {
          fields: { id: { type: "string" }, desired: { type: "object" }, observed: { type: "object" } },
        },
      },
    };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "HelmRelease" })).toBe(true);
  });

  it("не matches: только spec без status", () => {
    const ont = { entities: { E: { fields: { id: { type: "string" }, spec: { type: "object" } } } } };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "E" })).toBe(false);
  });

  it("не matches: только status без spec", () => {
    const ont = { entities: { E: { fields: { id: { type: "string" }, status: { type: "object" } } } } };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "E" })).toBe(false);
  });

  it("не matches: archetype != detail", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyFlux, { archetype: "catalog", mainEntity: "Kustomization" })).toBe(false);
  });

  it("не matches: mainEntity не в ontology", () => {
    expect(specVsStatusPanels.trigger.match([], ontologyFlux, { archetype: "detail", mainEntity: "Missing" })).toBe(false);
  });

  it("matches: config/live convention fields", () => {
    const ont = { entities: { TFResource: { fields: { config: { type: "object" }, live: { type: "object" } } } } };
    expect(specVsStatusPanels.trigger.match([], ont, { archetype: "detail", mainEntity: "TFResource" })).toBe(true);
  });
});

describe("spec-vs-status-panels — structure.apply", () => {
  const ontology = ontologyFlux;
  const projection = projFlux;

  it("выставляет body.renderAs specStatusSplit", () => {
    const slots = { body: { type: "fields", items: [] } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology, projection });
    expect(out.body.renderAs).toEqual({ type: "specStatusSplit", specField: "spec", statusField: "status" });
  });

  it("сохраняет остальные поля body", () => {
    const slots = { body: { type: "fields", source: "kustomizations", custom: 42 } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology, projection });
    expect(out.body.type).toBe("fields");
    expect(out.body.source).toBe("kustomizations");
    expect(out.body.custom).toBe(42);
  });

  it("no-op: body.renderAs уже задан (author-override)", () => {
    const slots = { body: { renderAs: { type: "custom" } } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology, projection });
    expect(out).toBe(slots);
  });

  it("no-op: projection.bodyOverride задан", () => {
    const slots = { body: { type: "fields" } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology, projection: { ...projection, bodyOverride: {} } });
    expect(out).toBe(slots);
  });

  it("no-op: нет body", () => {
    const out = specVsStatusPanels.structure.apply({}, { ontology, projection });
    expect(out).toEqual({});
  });

  it("specField из group.field при наличии groups", () => {
    const ont = {
      entities: {
        App: {
          fields: { cfg: { type: "object" }, obs: { type: "object" } },
          groups: [{ kind: "spec", field: "cfg" }, { kind: "status", field: "obs" }],
        },
      },
    };
    const slots = { body: { type: "fields" } };
    const out = specVsStatusPanels.structure.apply(slots, { ontology: ont, projection: { archetype: "detail", mainEntity: "App" } });
    expect(out.body.renderAs.specField).toBe("cfg");
    expect(out.body.renderAs.statusField).toBe("obs");
  });
});

describe("spec-vs-status-panels — helpers", () => {
  it("detectSpecStatusFields: convention spec + status", () => {
    const entity = { fields: { spec: { type: "object" }, status: { type: "object" }, name: { type: "string" } } };
    expect(detectSpecStatusFields(entity)).toEqual({ specField: "spec", statusField: "status", source: "convention" });
  });

  it("detectSpecStatusFields: groups priority над convention", () => {
    const entity = {
      fields: { spec: { type: "object" }, status: { type: "object" } },
      groups: [{ kind: "spec", field: "custom_spec" }, { kind: "observed", field: "custom_obs" }],
    };
    const r = detectSpecStatusFields(entity);
    expect(r.source).toBe("groups");
    expect(r.specField).toBe("custom_spec");
    expect(r.statusField).toBe("custom_obs");
  });

  it("detectSpecStatusFields: null если нет обоих слоёв", () => {
    const entity = { fields: { name: { type: "string" }, spec: { type: "object" } } };
    expect(detectSpecStatusFields(entity)).toBe(null);
  });

  it("detectSpecStatusFields: desired / live convention", () => {
    const entity = { fields: { desired: { type: "object" }, live: { type: "object" } } };
    const r = detectSpecStatusFields(entity);
    expect(r?.specField).toBe("desired");
    expect(r?.statusField).toBe("live");
  });
});
