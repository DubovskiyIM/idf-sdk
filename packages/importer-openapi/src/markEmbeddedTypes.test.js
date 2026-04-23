import { describe, it, expect } from "vitest";
import { markEmbeddedTypes } from "./markEmbeddedTypes.js";
import { importOpenApi } from "./index.js";

describe("markEmbeddedTypes", () => {
  it("orphan entity (не target нигде) + kind=internal → embedded", () => {
    const entities = {
      User: { kind: "internal", fields: { id: {} } },
      AccessToken: { kind: "internal", fields: { id: {}, token: {} } },
    };
    const intents = {
      readUser: { target: "User" },
    };
    const result = markEmbeddedTypes(entities, intents);
    expect(result.User.kind).toBe("internal"); // Targeted — не embedded
    expect(result.AccessToken.kind).toBe("embedded"); // orphan → embedded
  });

  it("intent.creates тоже считается за usage", () => {
    const entities = {
      Report: { kind: "internal", fields: { id: {} } },
    };
    const intents = {
      generateReport: { creates: "Report" },
    };
    const result = markEmbeddedTypes(entities, intents);
    expect(result.Report.kind).toBe("internal");
  });

  it("не перезаписывает explicit kind: reference / assignment / mirror / embedded", () => {
    const entities = {
      Asset: { kind: "reference", fields: { id: {} } },
      Assignment: { kind: "assignment", fields: { id: {} } },
      Mirror: { kind: "mirror", fields: { id: {} } },
      AlreadyEmbedded: { kind: "embedded", fields: { id: {} } },
    };
    const intents = {};
    const result = markEmbeddedTypes(entities, intents);
    expect(result.Asset.kind).toBe("reference");
    expect(result.Assignment.kind).toBe("assignment");
    expect(result.Mirror.kind).toBe("mirror");
    expect(result.AlreadyEmbedded.kind).toBe("embedded");
  });

  it("entity без kind (undefined) и без intents → embedded", () => {
    const entities = {
      Helper: { fields: { id: {} } }, // нет kind
    };
    const intents = {};
    const result = markEmbeddedTypes(entities, intents);
    expect(result.Helper.kind).toBe("embedded");
  });

  it("не мутирует вход", () => {
    const entities = {
      Orphan: { kind: "internal", fields: { id: {} } },
    };
    const beforeJson = JSON.stringify(entities);
    markEmbeddedTypes(entities, {});
    expect(JSON.stringify(entities)).toBe(beforeJson);
  });

  it("пустой intents — все internal orphan'ы становятся embedded", () => {
    const entities = {
      A: { kind: "internal", fields: {} },
      B: { fields: {} },
      C: { kind: "reference", fields: {} },
    };
    const result = markEmbeddedTypes(entities, {});
    expect(result.A.kind).toBe("embedded");
    expect(result.B.kind).toBe("embedded");
    expect(result.C.kind).toBe("reference");
  });
});

describe("importOpenApi — markEmbedded integration", () => {
  const spec = {
    components: {
      schemas: {
        User: {
          type: "object",
          properties: { id: { type: "string", readOnly: true }, username: { type: "string" } },
        },
        AccessToken: {
          type: "object",
          properties: { id: { type: "string" }, token: { type: "string" } },
        },
        AuthDetailsRepresentation: {
          type: "object",
          properties: { id: { type: "string" }, ip: { type: "string" } },
        },
      },
    },
    paths: {
      "/users/{user}": {
        get: { operationId: "readUser", responses: { 200: { description: "ok" } } },
      },
    },
  };

  it("default: orphan'ы получают kind:'embedded'", () => {
    const result = importOpenApi(spec);
    expect(result.entities.User?.kind).toBe("internal"); // targeted
    expect(result.entities.AccessToken?.kind).toBe("embedded");
    // AuthDetailsRepresentation deduped (dedupRepresentations default=true) →
    // short AuthDetails могут не существовать; если exists как embedded — ok.
    if (result.entities.AuthDetails) {
      expect(result.entities.AuthDetails.kind).toBe("embedded");
    }
  });

  it("opts.markEmbedded=false — back-compat", () => {
    const result = importOpenApi(spec, { markEmbedded: false });
    expect(result.entities.AccessToken?.kind).toBe("internal");
  });

  it("после merge XRepresentation target уже aliased → embedded check корректный", () => {
    const specWithRep = {
      components: {
        schemas: {
          Client: { type: "object", properties: { id: {} } },
          ClientRepresentation: {
            type: "object",
            properties: { id: {}, clientId: { type: "string" }, enabled: { type: "boolean" } },
          },
          UnrelatedHelper: {
            type: "object",
            properties: { id: {}, foo: { type: "string" } },
          },
        },
      },
      paths: {
        "/clients": {
          get: { operationId: "listClient", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(specWithRep);
    // Client merged (short) + targeted → не embedded
    expect(result.entities.Client).toBeDefined();
    expect(result.entities.Client.kind).toBe("internal");
    expect(result.entities.ClientRepresentation).toBeUndefined();
    // UnrelatedHelper — orphan → embedded
    expect(result.entities.UnrelatedHelper?.kind).toBe("embedded");
  });
});
