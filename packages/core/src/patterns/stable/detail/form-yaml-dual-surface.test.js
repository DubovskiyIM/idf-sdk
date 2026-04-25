import { describe, it, expect } from "vitest";
import formYamlDualSurface from "./form-yaml-dual-surface.js";
const { isYamlEditorEntity } = formYamlDualSurface._helpers;

const ontologyK8s = {
  entities: {
    Application: {
      fields: {
        id: { type: "string" },
        apiVersion: { type: "string" },
        kind: { type: "string" },
        metadata: { type: "object" },
        spec: { type: "object" },
      },
    },
  },
};

const ontologyYamlField = {
  entities: {
    Repository: {
      fields: {
        id: { type: "string" },
        url: { type: "string" },
        tlsClientCertData: { type: "yaml" },
      },
    },
  },
};

const ontologyResourceClass = {
  entities: {
    HelmChart: {
      resourceClass: "helm",
      fields: { id: { type: "string" }, chart: { type: "string" } },
    },
  },
};

describe("form-yaml-dual-surface — trigger.match", () => {
  it("matches: K8s convention (apiVersion + kind + metadata)", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyK8s, { archetype: "form", mainEntity: "Application" })).toBe(true);
    expect(formYamlDualSurface.trigger.match([], ontologyK8s, { archetype: "detail", mainEntity: "Application" })).toBe(true);
  });

  it("matches: yaml-type field", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyYamlField, { archetype: "form", mainEntity: "Repository" })).toBe(true);
  });

  it("matches: entity.resourceClass", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyResourceClass, { archetype: "detail", mainEntity: "HelmChart" })).toBe(true);
  });

  it("matches: fieldRole manifest", () => {
    const ont = { entities: { E: { fields: { id: { type: "string" }, raw: { type: "string", fieldRole: "manifest" } } } } };
    expect(formYamlDualSurface.trigger.match([], ont, { archetype: "form", mainEntity: "E" })).toBe(true);
  });

  it("не matches: обычная форма без yaml/manifest signals", () => {
    const ont = { entities: { Booking: { fields: { id: { type: "string" }, date: { type: "datetime" } } } } };
    expect(formYamlDualSurface.trigger.match([], ont, { archetype: "form", mainEntity: "Booking" })).toBe(false);
  });

  it("не matches: archetype catalog/feed/dashboard", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyK8s, { archetype: "catalog", mainEntity: "Application" })).toBe(false);
  });

  it("не matches: null archetype (любой) с невалидным entity", () => {
    expect(formYamlDualSurface.trigger.match([], {}, { mainEntity: "Missing" })).toBe(false);
  });
});

describe("form-yaml-dual-surface — structure.apply", () => {
  it("form-archetype: выставляет slots.form.renderAs", () => {
    const slots = { form: { type: "form", fields: [] } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "form", mainEntity: "Application" } });
    expect(out.form.renderAs).toEqual({ type: "formYamlDualSurface" });
  });

  it("detail-archetype: выставляет slots.body.renderAs", () => {
    const slots = { body: { type: "fields" } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "detail", mainEntity: "Application" } });
    expect(out.body.renderAs).toEqual({ type: "formYamlDualSurface" });
  });

  it("no-op: form.renderAs уже задан", () => {
    const slots = { form: { renderAs: { type: "existing" } } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "form", mainEntity: "Application" } });
    expect(out).toBe(slots);
  });

  it("no-op: body.renderAs уже задан", () => {
    const slots = { body: { renderAs: { type: "existing" } } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "detail", mainEntity: "Application" } });
    expect(out).toBe(slots);
  });

  it("no-op: projection.bodyOverride задан", () => {
    const slots = { body: { type: "fields" } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "detail", mainEntity: "Application", bodyOverride: {} } });
    expect(out).toBe(slots);
  });

  it("no-op: entity не yaml-editor (booking)", () => {
    const ont = { entities: { Booking: { fields: { id: { type: "string" } } } } };
    const slots = { form: { type: "form" } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ont, projection: { archetype: "form", mainEntity: "Booking" } });
    expect(out).toBe(slots);
  });

  it("сохраняет остальные поля form без изменений", () => {
    const slots = { form: { type: "form", action: "create_app", custom: 42 } };
    const out = formYamlDualSurface.structure.apply(slots, { ontology: ontologyK8s, projection: { archetype: "form", mainEntity: "Application" } });
    expect(out.form.action).toBe("create_app");
    expect(out.form.custom).toBe(42);
  });
});

describe("form-yaml-dual-surface — helpers", () => {
  it("isYamlEditorEntity: K8s convention", () => {
    const entity = { fields: { apiVersion: {}, kind: {}, metadata: {}, spec: {} } };
    expect(isYamlEditorEntity(entity)).toBe(true);
  });

  it("isYamlEditorEntity: yaml field type", () => {
    expect(isYamlEditorEntity({ fields: { cfg: { type: "yaml" } } })).toBe(true);
  });

  it("isYamlEditorEntity: resourceClass helm", () => {
    expect(isYamlEditorEntity({ resourceClass: "helm", fields: {} })).toBe(true);
  });

  it("isYamlEditorEntity: false без signals", () => {
    expect(isYamlEditorEntity({ fields: { name: { type: "string" }, date: { type: "datetime" } } })).toBe(false);
  });

  it("isYamlEditorEntity: fieldRole template", () => {
    expect(isYamlEditorEntity({ fields: { tpl: { type: "string", fieldRole: "template" } } })).toBe(true);
  });
});
