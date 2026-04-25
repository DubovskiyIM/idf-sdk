import { describe, it, expect } from "vitest";
import pattern from "./generator-preview-matrix.js";
const { detectTemplateField, detectGeneratedField } = pattern._helpers;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function mkApplicationSetEntity() {
  return {
    fields: {
      id: { type: "text" },
      name: { type: "text" },
      spec: { type: "json" },
      applications: { type: "entityRef[]", references: "Application" },
      syncStatus: { type: "select", values: ["Synced", "OutOfSync", "Unknown"] },
    },
  };
}

function mkApplicationEntity() {
  return {
    fields: {
      id: { type: "text" },
      name: { type: "text" },
      namespace: { type: "text" },
      cluster: { type: "text" },
      status: { type: "select", values: ["Healthy", "Degraded", "Progressing"] },
    },
  };
}

function mkArgoCDOntology() {
  return {
    entities: {
      ApplicationSet: mkApplicationSetEntity(),
      Application: mkApplicationEntity(),
    },
  };
}

function mkBulkIntent() {
  return {
    id: "sync_applicationset",
    creates: "Application[]",
    particles: {
      entities: ["a: ApplicationSet"],
      effects: [{ α: "add", target: "applications" }],
    },
  };
}

function mkSingleCreateIntent(entity = "Application") {
  return {
    id: "create_application",
    creates: entity,
    particles: {
      entities: ["a: ApplicationSet"],
      effects: [{ α: "add", target: "applications" }],
    },
  };
}

// ─── detectTemplateField ──────────────────────────────────────────────────────

describe("detectTemplateField", () => {
  it("находит поле 'spec' как template-like", () => {
    expect(detectTemplateField(mkApplicationSetEntity())).toBe("spec");
  });

  it("находит поле 'template' по имени", () => {
    const entity = { fields: { id: { type: "text" }, template: { type: "json" } } };
    expect(detectTemplateField(entity)).toBe("template");
  });

  it("находит поле 'definition' по имени", () => {
    const entity = { fields: { id: { type: "text" }, definition: { type: "json" } } };
    expect(detectTemplateField(entity)).toBe("definition");
  });

  it("находит поле 'generator' по имени", () => {
    const entity = { fields: { generator: { type: "json" } } };
    expect(detectTemplateField(entity)).toBe("generator");
  });

  it("находит поле 'blueprint' по имени", () => {
    const entity = { fields: { blueprint: { type: "json" } } };
    expect(detectTemplateField(entity)).toBe("blueprint");
  });

  it("находит поле с fieldRole 'template'", () => {
    const entity = { fields: { config: { type: "json", fieldRole: "template" } } };
    expect(detectTemplateField(entity)).toBe("config");
  });

  it("возвращает null если нет template-like поля", () => {
    const entity = { fields: { id: { type: "text" }, name: { type: "text" } } };
    expect(detectTemplateField(entity)).toBeNull();
  });

  it("возвращает null для пустого entity", () => {
    expect(detectTemplateField({})).toBeNull();
    expect(detectTemplateField(null)).toBeNull();
  });
});

// ─── detectGeneratedField ─────────────────────────────────────────────────────

describe("detectGeneratedField", () => {
  it("находит поле 'applications' по паттерну /applications/", () => {
    expect(detectGeneratedField(mkApplicationSetEntity())).toBe("applications");
  });

  it("находит поле 'instances' по паттерну /instances/", () => {
    const entity = { fields: { id: { type: "text" }, instances: { type: "entityRef[]" } } };
    expect(detectGeneratedField(entity)).toBe("instances");
  });

  it("находит поле 'generatedJobs' по паттерну /generated/", () => {
    const entity = { fields: { generatedJobs: { type: "entityRef[]" } } };
    expect(detectGeneratedField(entity)).toBe("generatedJobs");
  });

  it("находит поле с fieldRole 'generated-instances'", () => {
    const entity = { fields: { outputs: { type: "entityRef[]", fieldRole: "generated-instances" } } };
    expect(detectGeneratedField(entity)).toBe("outputs");
  });

  it("возвращает null если нет generated-like поля", () => {
    const entity = { fields: { id: { type: "text" }, name: { type: "text" } } };
    expect(detectGeneratedField(entity)).toBeNull();
  });
});

// ─── trigger.match ────────────────────────────────────────────────────────────

describe("generator-preview-matrix trigger.match", () => {
  it("срабатывает на ApplicationSet с bulk-creation intent", () => {
    const ok = pattern.trigger.match(
      [mkBulkIntent()],
      mkArgoCDOntology(),
      { archetype: "detail", mainEntity: "ApplicationSet" },
    );
    expect(ok).toBe(true);
  });

  it("срабатывает если creates содержит []", () => {
    const intent = { id: "generate", creates: "Application[]", particles: { entities: [], effects: [] } };
    const ok = pattern.trigger.match(
      [intent],
      mkArgoCDOntology(),
      { mainEntity: "ApplicationSet" },
    );
    expect(ok).toBe(true);
  });

  it("срабатывает если intent.bulk === true", () => {
    const intent = { id: "apply_set", bulk: true, creates: "Application", particles: { entities: [], effects: [] } };
    const ok = pattern.trigger.match(
      [intent],
      mkArgoCDOntology(),
      { mainEntity: "ApplicationSet" },
    );
    expect(ok).toBe(true);
  });

  it("не срабатывает без bulk-creation intent", () => {
    const ok = pattern.trigger.match(
      [mkSingleCreateIntent("ApplicationSet")],
      mkArgoCDOntology(),
      { archetype: "detail", mainEntity: "ApplicationSet" },
    );
    expect(ok).toBe(false);
  });

  it("не срабатывает без template-like field", () => {
    const ontology = {
      entities: {
        SomeEntity: {
          fields: {
            id: { type: "text" },
            applications: { type: "entityRef[]" },
          },
        },
      },
    };
    const ok = pattern.trigger.match(
      [mkBulkIntent()],
      ontology,
      { mainEntity: "SomeEntity" },
    );
    expect(ok).toBe(false);
  });

  it("не срабатывает без generated-like field", () => {
    const ontology = {
      entities: {
        SomeEntity: {
          fields: {
            id: { type: "text" },
            spec: { type: "json" },
          },
        },
      },
    };
    const ok = pattern.trigger.match(
      [mkBulkIntent()],
      ontology,
      { mainEntity: "SomeEntity" },
    );
    expect(ok).toBe(false);
  });

  it("не срабатывает на catalog archetype", () => {
    const ok = pattern.trigger.match(
      [mkBulkIntent()],
      mkArgoCDOntology(),
      { archetype: "catalog", mainEntity: "ApplicationSet" },
    );
    expect(ok).toBe(false);
  });

  it("не срабатывает если mainEntity не существует в ontology", () => {
    const ok = pattern.trigger.match(
      [mkBulkIntent()],
      mkArgoCDOntology(),
      { mainEntity: "NonExistent" },
    );
    expect(ok).toBe(false);
  });
});

// ─── structure.apply ──────────────────────────────────────────────────────────

describe("generator-preview-matrix structure.apply", () => {
  const baseContext = {
    ontology: mkArgoCDOntology(),
    mainEntity: "ApplicationSet",
    projection: {},
  };

  it("добавляет overlay generatorMatrix в пустые slots", () => {
    const result = pattern.structure.apply({}, baseContext);
    expect(Array.isArray(result.overlays)).toBe(true);
    expect(result.overlays).toHaveLength(1);
    const overlay = result.overlays[0];
    expect(overlay.id).toBe("generator_preview");
    expect(overlay.type).toBe("generatorMatrix");
    expect(overlay.instancesField).toBe("applications");
    expect(overlay.templateField).toBe("spec");
    expect(overlay.source).toBe("derived:generator-preview-matrix");
  });

  it("columns включают name/namespace/cluster когда Application entity доступна", () => {
    const result = pattern.structure.apply({}, baseContext);
    const overlay = result.overlays[0];
    expect(overlay.columns).toContain("name");
    expect(overlay.columns).toContain("namespace");
    expect(overlay.columns).toContain("cluster");
  });

  it("idempotent: не добавляет второй overlay если уже есть generator_preview", () => {
    const existing = { overlays: [{ id: "generator_preview", type: "generatorMatrix" }] };
    const result = pattern.structure.apply(existing, baseContext);
    expect(result.overlays).toHaveLength(1);
    expect(result).toBe(existing); // same reference, no mutation
  });

  it("idempotent: не добавляет overlay если тип generatorMatrix уже задан", () => {
    const existing = { overlays: [{ id: "custom", type: "generatorMatrix" }] };
    const result = pattern.structure.apply(existing, baseContext);
    expect(result.overlays).toHaveLength(1);
    expect(result).toBe(existing);
  });

  it("author-override projection.generatorPreview:false → no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ...baseContext,
      projection: { generatorPreview: false },
    });
    expect(result).toBe(slots);
  });

  it("сохраняет уже существующие overlays", () => {
    const existing = { overlays: [{ id: "existing_overlay", type: "other" }] };
    const result = pattern.structure.apply(existing, baseContext);
    expect(result.overlays).toHaveLength(2);
    expect(result.overlays[0].id).toBe("existing_overlay");
    expect(result.overlays[1].id).toBe("generator_preview");
  });

  it("не мутирует исходный slots-объект", () => {
    const slots = { overlays: [] };
    const originalLength = slots.overlays.length;
    pattern.structure.apply(slots, baseContext);
    expect(slots.overlays.length).toBe(originalLength);
  });

  it("fallback на DEFAULT_COLUMNS когда generated entity не распознана", () => {
    const ontology = {
      entities: {
        SomeSet: {
          fields: {
            spec: { type: "json" },
            instances: { type: "entityRef[]" },
          },
        },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology,
      mainEntity: "SomeSet",
      projection: {},
    });
    expect(result.overlays[0].columns).toEqual(["name", "id"]);
  });

  it("no-op если mainEntity не существует в ontology", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: mkArgoCDOntology(),
      mainEntity: "NonExistent",
      projection: {},
    });
    expect(result).toBe(slots);
  });
});
