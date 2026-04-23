import { describe, it, expect } from "vitest";
import { inferFieldRole, inferFieldRolesForEntities } from "./inferFieldRoles.js";
import { importOpenApi } from "./index.js";

describe("inferFieldRole (единичный)", () => {
  it("password / secret / token → secret", () => {
    expect(inferFieldRole("password", {})).toBe("secret");
    expect(inferFieldRole("storePassword", {})).toBe("secret");
    expect(inferFieldRole("keyPassword", {})).toBe("secret");
    expect(inferFieldRole("secret", {})).toBe("secret");
    expect(inferFieldRole("clientSecret", {})).toBe("secret");
    expect(inferFieldRole("token", {})).toBe("secret");
    expect(inferFieldRole("registrationAccessToken", {})).toBe("secret");
  });

  it("datetime pattern'ы → datetime", () => {
    expect(inferFieldRole("createdAt", {})).toBe("datetime");
    expect(inferFieldRole("updated_at", {})).toBe("datetime");
    expect(inferFieldRole("sentDate", {})).toBe("datetime");
    expect(inferFieldRole("lastUpdatedDate", {})).toBe("datetime");
    expect(inferFieldRole("notBefore", {})).toBe("datetime");
    expect(inferFieldRole("expiresAt", {})).toBe("datetime");
    expect(inferFieldRole("createdTimestamp", {})).toBe("datetime");
  });

  it("email → email", () => {
    expect(inferFieldRole("email", {})).toBe("email");
    expect(inferFieldRole("primaryEmail", {})).toBe("email");
  });

  it("url / uri → url", () => {
    expect(inferFieldRole("rootUrl", {})).toBe("url");
    expect(inferFieldRole("baseUrl", {})).toBe("url");
    expect(inferFieldRole("redirectUri", {})).toBe("url");
    expect(inferFieldRole("redirectUris", {})).toBe("url");
    expect(inferFieldRole("webOrigins", {})).toBe("url");
  });

  it("FALSE POSITIVE guard: numeric type != secret даже для token-like имён", () => {
    expect(inferFieldRole("refreshTokenMaxReuse", { type: "integer" })).toBe(null);
    expect(inferFieldRole("accessTokenLifespan", { type: "number" })).toBe(null);
    expect(inferFieldRole("tokenTTL", { type: "int" })).toBe(null);
  });

  it("нейтральные поля → null", () => {
    expect(inferFieldRole("id", {})).toBe(null);
    expect(inferFieldRole("name", {})).toBe(null);
    expect(inferFieldRole("enabled", {})).toBe(null);
    expect(inferFieldRole("count", {})).toBe(null);
  });

  it("пустое имя → null", () => {
    expect(inferFieldRole("", {})).toBe(null);
    expect(inferFieldRole(null, {})).toBe(null);
  });
});

describe("inferFieldRolesForEntities", () => {
  it("применяет inferFieldRole ко всем полям entities", () => {
    const entities = {
      User: {
        fields: {
          id: { type: "string" },
          email: { type: "string" },
          password: { type: "string" },
          createdAt: { type: "string" },
          profileUrl: { type: "string" },
        },
      },
    };
    const result = inferFieldRolesForEntities(entities);
    expect(result.User.fields.id.fieldRole).toBeUndefined();
    expect(result.User.fields.email.fieldRole).toBe("email");
    expect(result.User.fields.password.fieldRole).toBe("secret");
    expect(result.User.fields.createdAt.fieldRole).toBe("datetime");
    expect(result.User.fields.profileUrl.fieldRole).toBe("url");
  });

  it("existing fieldRole НЕ перезаписывается (authored wins)", () => {
    const entities = {
      User: {
        fields: {
          email: { type: "string", fieldRole: "primary-title" },
        },
      },
    };
    const result = inferFieldRolesForEntities(entities);
    expect(result.User.fields.email.fieldRole).toBe("primary-title");
  });

  it("не мутирует вход + возвращает тот же объект для unchanged entities", () => {
    const entities = {
      Neutral: { fields: { id: { type: "string" }, name: { type: "string" } } },
      Chatty: { fields: { email: { type: "string" } } },
    };
    const beforeJson = JSON.stringify(entities);
    const result = inferFieldRolesForEntities(entities);
    expect(JSON.stringify(entities)).toBe(beforeJson);
    // Для Neutral нет inferrable полей → identity
    expect(result.Neutral).toBe(entities.Neutral);
    // Для Chatty — новый объект
    expect(result.Chatty).not.toBe(entities.Chatty);
    expect(result.Chatty.fields.email.fieldRole).toBe("email");
  });

  it("array fields (legacy format) — не трогает", () => {
    const entities = {
      LegacyArrayFields: { fields: ["id", "email"] },
    };
    const result = inferFieldRolesForEntities(entities);
    expect(result.LegacyArrayFields).toBe(entities.LegacyArrayFields);
  });
});

describe("importOpenApi — inferFieldRoles integration", () => {
  const spec = {
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", readOnly: true },
            username: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
            createdTimestamp: { type: "integer" },
            accessTokenLifespan: { type: "integer" },
            profileUrl: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/users/{user}": {
        get: { operationId: "readUser", responses: { 200: { description: "ok" } } },
      },
    },
  };

  it("default: semantic fields получают fieldRole", () => {
    const result = importOpenApi(spec);
    const fields = result.entities.User?.fields || {};
    expect(fields.email?.fieldRole).toBe("email");
    expect(fields.password?.fieldRole).toBe("secret");
    expect(fields.profileUrl?.fieldRole).toBe("url");
  });

  it("numeric guard: accessTokenLifespan — не secret (type=integer)", () => {
    const result = importOpenApi(spec);
    expect(result.entities.User?.fields?.accessTokenLifespan?.fieldRole).toBeUndefined();
  });

  it("createdTimestamp (integer) guard: NOT datetime по имени — numeric type блокирует", () => {
    const result = importOpenApi(spec);
    // createdTimestamp имеет type:integer → NUMERIC_TYPES guard срабатывает
    // перед любой pattern-проверкой, даже если имя matches datetime-regex
    expect(result.entities.User?.fields?.createdTimestamp?.fieldRole).toBeUndefined();
  });

  it("opts.inferFieldRoles=false — back-compat", () => {
    const result = importOpenApi(spec, { inferFieldRoles: false });
    expect(result.entities.User?.fields?.email?.fieldRole).toBeUndefined();
    expect(result.entities.User?.fields?.password?.fieldRole).toBeUndefined();
  });
});
