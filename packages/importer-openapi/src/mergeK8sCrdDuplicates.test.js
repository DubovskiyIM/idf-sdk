import { describe, it, expect } from "vitest";
import { mergeK8sCrdDuplicates } from "./mergeK8sCrdDuplicates.js";

describe("mergeK8sCrdDuplicates", () => {
  it("merges v1alpha1Application → Application (path stub с id + schema с полями)", () => {
    const entities = {
      Application: { name: "Application", kind: "internal", fields: { id: { type: "string" } } },
      v1alpha1Application: {
        name: "v1alpha1Application",
        kind: "embedded",
        fields: {
          metadata: { type: "object" },
          spec: { type: "object" },
          status: { type: "object" },
        },
      },
    };
    const { entities: merged, aliases } = mergeK8sCrdDuplicates(entities);

    expect(merged.Application.kind).toBe("internal");
    expect(Object.keys(merged.Application.fields)).toEqual(
      expect.arrayContaining(["id", "metadata", "spec", "status"]),
    );
    // id stub preserves (синтетический PK)
    expect(merged.Application.fields.id).toEqual({ type: "string" });
    expect(aliases.v1alpha1Application).toBe("Application");

    // Default: v1alpha1X сохранён для wrapper-refs
    expect(merged.v1alpha1Application).toBeDefined();
  });

  it("поддерживает v1, v1alpha, v1alpha1, v1beta2 etc.", () => {
    const entities = {
      Application: { name: "Application", fields: { id: { type: "string" } } },
      Cluster:     { name: "Cluster",     fields: { id: { type: "string" } } },
      Pod:         { name: "Pod",         fields: { id: { type: "string" } } },
      Hpa:         { name: "Hpa",         fields: { id: { type: "string" } } },
      v1alpha1Application: { fields: { spec: { type: "object" } } },
      v1beta2Cluster:      { fields: { server: { type: "string" } } },
      v1Pod:               { fields: { status: { type: "object" } } },
      v2Hpa:               { fields: { minReplicas: { type: "integer" } } },
    };
    const { aliases } = mergeK8sCrdDuplicates(entities);
    expect(aliases.v1alpha1Application).toBe("Application");
    expect(aliases.v1beta2Cluster).toBe("Cluster");
    expect(aliases.v1Pod).toBe("Pod");
    expect(aliases.v2Hpa).toBe("Hpa");
  });

  it("case-insensitive lookup: Applicationset stub ← v1alpha1ApplicationSet", () => {
    const entities = {
      Applicationset: { name: "Applicationset", fields: { id: { type: "string" } } },
      v1alpha1ApplicationSet: {
        fields: { metadata: { type: "object" }, spec: { type: "object" } },
      },
    };
    const { entities: merged, aliases } = mergeK8sCrdDuplicates(entities);
    expect(aliases.v1alpha1ApplicationSet).toBe("Applicationset");
    expect(Object.keys(merged.Applicationset.fields)).toContain("spec");
  });

  it("skip если нет short-name stub'а (no path-derived entity)", () => {
    const entities = {
      v1alpha1AppProject: { fields: { spec: { type: "object" } } },
      // Нет path-derived "AppProject" или "Project" stub'а
    };
    const { entities: merged, aliases } = mergeK8sCrdDuplicates(entities);
    expect(aliases).toEqual({});
    expect(merged.v1alpha1AppProject).toBeDefined();
  });

  it("skip на не-K8s pattern'ах (RealmRepresentation, PolicyDTO etc.)", () => {
    const entities = {
      Realm: { fields: { id: { type: "string" } } },
      RealmRepresentation: { fields: { enabled: { type: "boolean" } } },
      Role: { fields: { id: { type: "string" } } },
      RoleDTO: { fields: { name: { type: "string" } } },
      version1Foo: { fields: { x: { type: "string" } } }, // v<digit> required
      v: { fields: {} }, // no digits
    };
    const { aliases } = mergeK8sCrdDuplicates(entities);
    expect(aliases).toEqual({});
  });

  it("stripOriginal:true удаляет v1alpha1X entity после merge", () => {
    const entities = {
      Application: { fields: { id: { type: "string" } } },
      v1alpha1Application: { fields: { spec: { type: "object" } } },
    };
    const { entities: merged, aliases } = mergeK8sCrdDuplicates(entities, {
      stripOriginal: true,
    });
    expect(merged.v1alpha1Application).toBeUndefined();
    expect(aliases.v1alpha1Application).toBe("Application");
  });

  it("field conflict: stub.name побеждает over full.name (PK convention)", () => {
    const entities = {
      Application: { fields: { id: { type: "string", readOnly: true } } },
      v1alpha1Application: {
        fields: {
          id: { type: "string", description: "override from full" },
          spec: { type: "object" },
        },
      },
    };
    const { entities: merged } = mergeK8sCrdDuplicates(entities);
    // stub.id побеждает (readOnly:true), full.id теряется
    expect(merged.Application.fields.id.readOnly).toBe(true);
    expect(merged.Application.fields.id.description).toBeUndefined();
  });

  it("kind: 'internal' всегда для merged entity (unmark embedded из full)", () => {
    const entities = {
      Application: { kind: "internal", fields: { id: {} } },
      v1alpha1Application: { kind: "embedded", fields: { spec: { type: "object" } } },
    };
    const { entities: merged } = mergeK8sCrdDuplicates(entities);
    expect(merged.Application.kind).toBe("internal");
  });

  it("relations мёрджатся (для FK синтеза)", () => {
    const entities = {
      Application: {
        fields: { id: {} },
        relations: { parent: { to: "Project" } },
      },
      v1alpha1Application: {
        fields: { spec: { type: "object" } },
        relations: { cluster: { to: "Cluster" } },
      },
    };
    const { entities: merged } = mergeK8sCrdDuplicates(entities);
    expect(merged.Application.relations).toEqual({
      parent: { to: "Project" },
      cluster: { to: "Cluster" },
    });
  });

  it("ArgoCD fixture — типичный разброс (Application, Cluster, ApplicationSet)", () => {
    const entities = {
      // Path-derived stubs (короткие, {id}-only)
      Application: { name: "Application", kind: "internal", fields: { id: { type: "string" } } },
      Cluster:     { name: "Cluster",     kind: "internal", fields: { id: { type: "string" } } },
      Applicationset: { name: "Applicationset", kind: "internal", fields: { id: { type: "string" } } },
      // Schema-derived (полные, embedded)
      v1alpha1Application:    { kind: "embedded", fields: { metadata: {}, operation: {}, spec: {}, status: {} } },
      v1alpha1Cluster:        { kind: "embedded", fields: { name: {}, server: {}, connectionState: {}, config: {} } },
      v1alpha1ApplicationSet: { kind: "embedded", fields: { metadata: {}, spec: {}, status: {} } },
      // Wrapper types — не должны трогаться
      v1alpha1ApplicationList: { kind: "embedded", fields: { items: {}, metadata: {} } },
    };

    const { entities: merged, aliases } = mergeK8sCrdDuplicates(entities);

    expect(Object.keys(aliases)).toEqual(
      expect.arrayContaining([
        "v1alpha1Application",
        "v1alpha1Cluster",
        "v1alpha1ApplicationSet",
      ]),
    );
    // Wrapper не помечен (нет ApplicationList stub'а)
    expect(aliases.v1alpha1ApplicationList).toBeUndefined();

    expect(Object.keys(merged.Application.fields).sort()).toEqual(
      ["id", "metadata", "operation", "spec", "status"],
    );
    expect(Object.keys(merged.Cluster.fields)).toContain("server");
    expect(Object.keys(merged.Applicationset.fields)).toContain("spec");
  });
});
