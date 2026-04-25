import { describe, it, expect } from "vitest";
import formYamlDualSurface from "./form-yaml-dual-surface.js";

const { isYamlField, detectYamlField, hasStructuredFields } =
  formYamlDualSurface._helpers;

// ─── Базовые данные ──────────────────────────────────────────────────────────

/** Application.spec — yaml-type + structured fields (ArgoCD). */
const ontologyArgo = {
  entities: {
    Application: {
      fields: {
        id:          { type: "string" },
        name:        { type: "string" },
        project:     { type: "string" },
        destination: { type: "string" },
        spec:        { type: "yaml" },
      },
    },
  },
};
const projArgo = { archetype: "detail", mainEntity: "Application" };

/** Keycloak Client — json export field + structured fields. */
const ontologyKeycloak = {
  entities: {
    Client: {
      fields: {
        id:           { type: "string" },
        clientId:     { type: "string" },
        protocol:     { type: "string" },
        enabled:      { type: "boolean" },
        definition:   { type: "json" },
      },
    },
  },
};
const projKeycloak = { archetype: "detail", mainEntity: "Client" };

/** Booking — только structured fields, нет yaml/manifest. */
const ontologyBooking = {
  entities: {
    Booking: {
      fields: {
        id:     { type: "string" },
        date:   { type: "datetime" },
        status: { type: "select", options: ["pending", "confirmed", "cancelled"] },
        price:  { type: "number", fieldRole: "money" },
      },
    },
  },
};
const projBooking = { archetype: "detail", mainEntity: "Booking" };

/** Sales Listing — text/multiImage/money, нет raw-manifest. */
const ontologySales = {
  entities: {
    Listing: {
      fields: {
        id:     { type: "string" },
        title:  { type: "string" },
        images: { type: "multiImage" },
        price:  { type: "number", fieldRole: "money" },
      },
    },
  },
};
const projListing = { archetype: "detail", mainEntity: "Listing" };

// ─── trigger.match ───────────────────────────────────────────────────────────

describe("form-yaml-dual-surface — trigger.match", () => {
  it("matches: ArgoCD Application (spec: yaml + structured fields)", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyArgo, projArgo)).toBe(true);
  });

  it("matches: Keycloak Client (definition: json + structured fields)", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyKeycloak, projKeycloak)).toBe(true);
  });

  it("matches: entity с fieldRole raw-manifest + structured field", () => {
    const ont = {
      entities: {
        Resource: {
          fields: {
            name:     { type: "string" },
            manifest: { type: "string", fieldRole: "raw-manifest" },
          },
        },
      },
    };
    expect(formYamlDualSurface.trigger.match([], ont, { archetype: "detail", mainEntity: "Resource" })).toBe(true);
  });

  it("matches: поле с именем 'manifest' (convention-based) + structured field", () => {
    const ont = {
      entities: {
        Config: {
          fields: {
            id:       { type: "string" },
            manifest: { type: "string" },
          },
        },
      },
    };
    expect(formYamlDualSurface.trigger.match([], ont, { archetype: "detail", mainEntity: "Config" })).toBe(true);
  });

  it("не matches: нет yaml/manifest field (только structured)", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyBooking, projBooking)).toBe(false);
  });

  it("не matches: archetype !== detail (catalog)", () => {
    expect(
      formYamlDualSurface.trigger.match([], ontologyArgo, { ...projArgo, archetype: "catalog" })
    ).toBe(false);
  });

  it("не matches: нет structured fields (только yaml)", () => {
    const ont = {
      entities: {
        RawDoc: {
          fields: {
            spec: { type: "yaml" },
          },
        },
      },
    };
    expect(formYamlDualSurface.trigger.match([], ont, { archetype: "detail", mainEntity: "RawDoc" })).toBe(false);
  });

  it("не matches: projection.noYamlToggle: true (kill-switch)", () => {
    expect(
      formYamlDualSurface.trigger.match([], ontologyArgo, { ...projArgo, noYamlToggle: true })
    ).toBe(false);
  });

  it("не matches: нет mainEntity", () => {
    expect(formYamlDualSurface.trigger.match([], ontologyArgo, { archetype: "detail" })).toBe(false);
  });
});

// ─── structure.apply ─────────────────────────────────────────────────────────

describe("form-yaml-dual-surface — structure.apply", () => {
  const context = { projection: projArgo, ontology: ontologyArgo };

  it("добавляет renderHint: yamlToggle + yamlField к form overlay без renderHint", () => {
    const slots = {
      overlays: [
        { id: "edit_application", kind: "form", entity: "Application" },
      ],
    };
    const out = formYamlDualSurface.structure.apply(slots, context);
    expect(out.overlays[0].renderHint).toBe("yamlToggle");
    expect(out.overlays[0].yamlField).toBe("spec");
  });

  it("сохраняет остальные поля overlay без изменений", () => {
    const slots = {
      overlays: [
        { id: "edit_app", kind: "formModal", entity: "Application", title: "Edit Application" },
      ],
    };
    const out = formYamlDualSurface.structure.apply(slots, context);
    expect(out.overlays[0].id).toBe("edit_app");
    expect(out.overlays[0].title).toBe("Edit Application");
    expect(out.overlays[0].kind).toBe("formModal");
  });

  it("no-op: overlay уже имеет renderHint (author-override)", () => {
    const slots = {
      overlays: [
        { id: "edit_app", kind: "form", entity: "Application", renderHint: "tabbedForm" },
      ],
    };
    const out = formYamlDualSurface.structure.apply(slots, context);
    expect(out).toBe(slots); // identity — мутации нет
  });

  it("no-op: overlay для другой entity (не mainEntity)", () => {
    const slots = {
      overlays: [
        { id: "edit_cluster", kind: "form", entity: "Cluster" },
      ],
    };
    const out = formYamlDualSurface.structure.apply(slots, context);
    expect(out).toBe(slots);
  });

  it("no-op: projection.noYamlToggle: true", () => {
    const slots = {
      overlays: [{ id: "edit_app", kind: "form", entity: "Application" }],
    };
    const out = formYamlDualSurface.structure.apply(slots, {
      projection: { ...projArgo, noYamlToggle: true },
      ontology: ontologyArgo,
    });
    expect(out).toBe(slots);
  });

  it("no-op: slots.overlays отсутствует", () => {
    const out = formYamlDualSurface.structure.apply({}, context);
    expect(out).toEqual({});
  });

  it("обрабатывает несколько overlays — применяет только к form/edit без renderHint + mainEntity", () => {
    const slots = {
      overlays: [
        { id: "view_app",  kind: "detail",    entity: "Application" },
        { id: "edit_app",  kind: "form",      entity: "Application" },
        { id: "edit_clus", kind: "form",      entity: "Cluster" },
        { id: "already",   kind: "form",      entity: "Application", renderHint: "tabbedForm" },
      ],
    };
    const out = formYamlDualSurface.structure.apply(slots, context);
    // view (detail kind) → пропускаем... но kind "detail" не в skip-list
    // Проверяем, что "edit_app" (form + Application) получил renderHint
    const editApp = out.overlays.find(o => o.id === "edit_app");
    expect(editApp.renderHint).toBe("yamlToggle");
    // edit_clus → другой entity → no change
    const editClus = out.overlays.find(o => o.id === "edit_clus");
    expect(editClus.renderHint).toBeUndefined();
    // already → renderHint сохранён
    const already = out.overlays.find(o => o.id === "already");
    expect(already.renderHint).toBe("tabbedForm");
  });

  it("detectYamlField: выбирает первое подходящее поле по declaration order", () => {
    const ont = {
      entities: {
        Res: {
          fields: {
            id:   { type: "string" },
            name: { type: "string" },
            spec: { type: "yaml" },
          },
        },
      },
    };
    const slots = { overlays: [{ id: "e", kind: "form" }] };
    const out = formYamlDualSurface.structure.apply(slots, {
      projection: { archetype: "detail", mainEntity: "Res" },
      ontology: ont,
    });
    expect(out.overlays[0].yamlField).toBe("spec");
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────────

describe("form-yaml-dual-surface — helpers", () => {
  describe("isYamlField", () => {
    it("fieldRole: raw-manifest → true", () => {
      expect(isYamlField("anything", { type: "string", fieldRole: "raw-manifest" })).toBe(true);
    });
    it("type: yaml → true", () => {
      expect(isYamlField("body", { type: "yaml" })).toBe(true);
    });
    it("type: json → true", () => {
      expect(isYamlField("config", { type: "json" })).toBe(true);
    });
    it("имя 'spec' (convention) → true даже без yaml-type", () => {
      expect(isYamlField("spec", { type: "string" })).toBe(true);
    });
    it("имя 'manifest' → true", () => {
      expect(isYamlField("manifest", { type: "text" })).toBe(true);
    });
    it("имя 'status' + type select → false (не yaml field)", () => {
      expect(isYamlField("status", { type: "select" })).toBe(false);
    });
    it("null fieldDef → false", () => {
      expect(isYamlField("spec", null)).toBe(false);
    });
  });

  describe("detectYamlField", () => {
    it("возвращает имя первого yaml-field", () => {
      const entity = {
        fields: {
          id:   { type: "string" },
          spec: { type: "yaml" },
        },
      };
      expect(detectYamlField(entity)).toBe("spec");
    });
    it("возвращает null если yaml-field нет", () => {
      const entity = { fields: { id: { type: "string" }, name: { type: "string" } } };
      expect(detectYamlField(entity)).toBe(null);
    });
    it("возвращает null для пустого entity", () => {
      expect(detectYamlField(null)).toBe(null);
      expect(detectYamlField({})).toBe(null);
    });
  });

  describe("hasStructuredFields", () => {
    it("true: entity с string + yaml field", () => {
      const entity = {
        fields: {
          name: { type: "string" },
          spec: { type: "yaml" },
        },
      };
      expect(hasStructuredFields(entity)).toBe(true);
    });
    it("false: только yaml field (нет structured)", () => {
      const entity = { fields: { spec: { type: "yaml" } } };
      expect(hasStructuredFields(entity)).toBe(false);
    });
    it("false: yaml + json (оба unstructured)", () => {
      const entity = { fields: { spec: { type: "yaml" }, raw: { type: "json" } } };
      expect(hasStructuredFields(entity)).toBe(false);
    });
    it("false: null entity", () => {
      expect(hasStructuredFields(null)).toBe(false);
    });
  });
});
