import { describe, it, expect } from "vitest";
import {
  mergeRepresentationDuplicates,
  rewriteReferencesByAliases,
  rewriteIntentTargetsByAliases,
} from "./mergeRepresentationDuplicates.js";
import { importOpenApi } from "./index.js";

describe("mergeRepresentationDuplicates", () => {
  it("сливает XRepresentation в X (rep fields приоритет)", () => {
    const entities = {
      Realm: {
        name: "Realm",
        kind: "internal",
        fields: { id: { type: "string" }, realm: { type: "string" } },
      },
      RealmRepresentation: {
        name: "RealmRepresentation",
        kind: "internal",
        fields: {
          id: { type: "string", readOnly: true },
          realm: { type: "string" },
          displayName: { type: "string" },
          enabled: { type: "boolean" },
        },
      },
    };
    const { entities: merged, aliases } = mergeRepresentationDuplicates(entities);
    expect(merged.Realm).toBeDefined();
    expect(merged.RealmRepresentation).toBeUndefined();
    expect(Object.keys(merged.Realm.fields)).toEqual(
      expect.arrayContaining(["id", "realm", "displayName", "enabled"]),
    );
    expect(aliases).toEqual({ RealmRepresentation: "Realm" });
  });

  it("несколько пар мерджатся независимо", () => {
    const entities = {
      Realm: { fields: { id: {} } },
      RealmRepresentation: { fields: { id: {}, realm: { type: "string" } } },
      Client: { fields: { id: {} } },
      ClientRepresentation: { fields: { id: {}, clientId: { type: "string" } } },
      User: { fields: { id: {} } },
      UserRepresentation: { fields: { id: {}, username: { type: "string" } } },
    };
    const { entities: merged, aliases } = mergeRepresentationDuplicates(entities);
    expect(Object.keys(merged).sort()).toEqual(["Client", "Realm", "User"]);
    expect(merged.Client.fields.clientId).toBeDefined();
    expect(merged.User.fields.username).toBeDefined();
    expect(Object.keys(aliases).length).toBe(3);
  });

  it("без пар — вход возвращается как есть, aliases пустой", () => {
    const entities = {
      Foo: { fields: { id: {} } },
      Bar: { fields: { id: {} } },
    };
    const { entities: merged, aliases } = mergeRepresentationDuplicates(entities);
    expect(merged).toEqual(entities);
    expect(aliases).toEqual({});
  });

  it("custom suffix (Spec / Status — K8s-style)", () => {
    const entities = {
      Pod: { fields: { id: {}, name: { type: "string" } } },
      PodSpec: { fields: { id: {}, containers: { type: "array" }, restartPolicy: { type: "string" } } },
    };
    const { entities: merged, aliases } = mergeRepresentationDuplicates(entities, { suffix: "Spec" });
    expect(merged.Pod).toBeDefined();
    expect(merged.PodSpec).toBeUndefined();
    expect(merged.Pod.fields.containers).toBeDefined();
    expect(aliases).toEqual({ PodSpec: "Pod" });
  });

  it("empty suffix — paranoia guard, ничего не мерджит", () => {
    const entities = { Foo: { fields: {} } };
    const { entities: merged, aliases } = mergeRepresentationDuplicates(entities, { suffix: "" });
    expect(merged).toEqual(entities);
    expect(aliases).toEqual({});
  });

  it("relations мерджатся", () => {
    const entities = {
      Realm: { relations: { belongsTo: [] } },
      RealmRepresentation: { relations: { hasMany: ["Client"] } },
    };
    const { entities: merged } = mergeRepresentationDuplicates(entities);
    expect(merged.Realm.relations).toEqual({ belongsTo: [], hasMany: ["Client"] });
  });
});

describe("rewriteReferencesByAliases", () => {
  it("переписывает field.references по aliases", () => {
    const entities = {
      User: {
        fields: {
          id: { type: "string" },
          realmId: { type: "string", references: "RealmRepresentation", kind: "foreignKey" },
        },
      },
    };
    const rewritten = rewriteReferencesByAliases(entities, { RealmRepresentation: "Realm" });
    expect(rewritten.User.fields.realmId.references).toBe("Realm");
  });

  it("не меняет entities если aliases пустой", () => {
    const entities = { User: { fields: { id: {} } } };
    const rewritten = rewriteReferencesByAliases(entities, {});
    expect(rewritten).toBe(entities);
  });

  it("не трогает FK с unknown references", () => {
    const entities = {
      User: { fields: { clientId: { references: "Client", kind: "foreignKey" } } },
    };
    const rewritten = rewriteReferencesByAliases(entities, { RealmRepresentation: "Realm" });
    expect(rewritten.User.fields.clientId.references).toBe("Client");
  });
});

describe("rewriteIntentTargetsByAliases", () => {
  it("переписывает intent.target и intent.creates", () => {
    const intents = {
      createRealm: { target: "RealmRepresentation", creates: "RealmRepresentation", alpha: "insert" },
      readRealm: { target: "RealmRepresentation" },
      somethingElse: { target: "Foo" },
    };
    const rewritten = rewriteIntentTargetsByAliases(intents, { RealmRepresentation: "Realm" });
    expect(rewritten.createRealm.target).toBe("Realm");
    expect(rewritten.createRealm.creates).toBe("Realm");
    expect(rewritten.readRealm.target).toBe("Realm");
    expect(rewritten.somethingElse.target).toBe("Foo");
  });
});

describe("importOpenApi — dedup integration", () => {
  const spec = {
    components: {
      schemas: {
        RealmRepresentation: {
          type: "object",
          properties: {
            id: { type: "string", readOnly: true },
            realm: { type: "string" },
            displayName: { type: "string" },
            enabled: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/admin/realms/{realm}": {
        get: { operationId: "readRealm", responses: { 200: { description: "ok" } } },
      },
    },
  };

  it("after import: Realm есть, RealmRepresentation удалён, fields from Representation", () => {
    const result = importOpenApi(spec);
    expect(result.entities.Realm).toBeDefined();
    expect(result.entities.RealmRepresentation).toBeUndefined();
    expect(result.entities.Realm.fields.displayName).toBeDefined();
    expect(result.entities.Realm.fields.enabled).toBeDefined();
  });

  it("opts.dedupRepresentations=false — back-compat без dedup", () => {
    const result = importOpenApi(spec, { dedupRepresentations: false });
    expect(result.entities.Realm).toBeDefined();
    expect(result.entities.RealmRepresentation).toBeDefined();
  });

  it("custom representation suffix", () => {
    const customSpec = {
      components: {
        schemas: {
          PodSpec: { type: "object", properties: { containers: { type: "array" } } },
        },
      },
      paths: {
        "/api/v1/pods/{pod}": {
          get: { operationId: "readPod", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(customSpec, { representationSuffix: "Spec" });
    expect(result.entities.Pod).toBeDefined();
    expect(result.entities.PodSpec).toBeUndefined();
    expect(result.entities.Pod.fields.containers).toBeDefined();
  });
});
