import { describe, it, expect } from "vitest";
import { pathToIntent, entityNameFromPath, detectActionEndpoint } from "../src/pathToIntent.js";
import { importOpenApi } from "../src/index.js";

describe("entityNameFromPath", () => {
  it("/tasks → Task", () => {
    expect(entityNameFromPath("/tasks")).toBe("Task");
  });

  it("/order-items → OrderItem", () => {
    expect(entityNameFromPath("/order-items")).toBe("OrderItem");
  });

  it("/tasks/{id} → Task (последний collection-сегмент)", () => {
    expect(entityNameFromPath("/tasks/{id}")).toBe("Task");
  });

  it("/api/v1/tasks → Task (пропускает префиксы)", () => {
    expect(entityNameFromPath("/api/v1/tasks")).toBe("Task");
  });

  it("/users/{id}/tasks → Task (последняя collection)", () => {
    expect(entityNameFromPath("/users/{id}/tasks")).toBe("Task");
  });
});

describe("pathToIntent", () => {
  it("POST /tasks → createTask с alpha:insert", () => {
    const it_ = pathToIntent("POST", "/tasks", { summary: "Create task" });
    expect(it_.name).toBe("createTask");
    expect(it_.intent.target).toBe("Task");
    expect(it_.intent.alpha).toBe("insert");
    expect(it_.intent.endpoint).toEqual({ method: "POST", path: "/tasks" });
  });

  it("GET /tasks → listTask (query)", () => {
    const it_ = pathToIntent("GET", "/tasks", {});
    expect(it_.name).toBe("listTask");
    expect(it_.intent.alpha).toBeUndefined();
  });

  it("GET /tasks/{id} → readTask с id-parameter", () => {
    const it_ = pathToIntent("GET", "/tasks/{id}", {});
    expect(it_.name).toBe("readTask");
    expect(it_.intent.parameters.id.required).toBe(true);
  });

  it("PATCH /tasks/{id} → updateTask с alpha:replace", () => {
    const it_ = pathToIntent("PATCH", "/tasks/{id}", {});
    expect(it_.name).toBe("updateTask");
    expect(it_.intent.alpha).toBe("replace");
  });

  it("PUT /tasks/{id} → updateTask (как PATCH)", () => {
    const it_ = pathToIntent("PUT", "/tasks/{id}", {});
    expect(it_.name).toBe("updateTask");
    expect(it_.intent.alpha).toBe("replace");
  });

  it("DELETE /tasks/{id} → removeTask с alpha:remove", () => {
    const it_ = pathToIntent("DELETE", "/tasks/{id}", {});
    expect(it_.name).toBe("removeTask");
    expect(it_.intent.alpha).toBe("remove");
  });

  it("operationId из spec берётся как имя intent если задан", () => {
    const it_ = pathToIntent("POST", "/tasks/{id}/approve", {
      operationId: "approveTask",
    });
    expect(it_.name).toBe("approveTask");
  });

  it("{id} в path добавляется как required parameter", () => {
    const it_ = pathToIntent("PATCH", "/tasks/{id}", {});
    expect(it_.intent.parameters.id.required).toBe(true);
  });

  it("endpoint с {} преобразуется в :param в IDF-формате", () => {
    const it_ = pathToIntent("PATCH", "/tasks/{id}", {});
    expect(it_.intent.endpoint.path).toBe("/tasks/:id");
  });
});

describe("pathToIntent / non-{id} path params", () => {
  it("GET /villagers/{villager} → readVillager с parameters.villager", () => {
    const it_ = pathToIntent("GET", "/villagers/{villager}", {});
    expect(it_.name).toBe("readVillager");
    expect(it_.intent.parameters.villager).toEqual({ type: "string", required: true });
  });

  it("DELETE /artworks/{artwork} → removeArtwork с alpha:remove + parameters.artwork", () => {
    const it_ = pathToIntent("DELETE", "/artworks/{artwork}", {});
    expect(it_.name).toBe("removeArtwork");
    expect(it_.intent.alpha).toBe("remove");
    expect(it_.intent.parameters.artwork).toEqual({ type: "string", required: true });
  });

  it("PATCH /fish/{fish} → updateFish с alpha:replace + parameters.fish", () => {
    const it_ = pathToIntent("PATCH", "/fish/{fish}", {});
    expect(it_.name).toBe("updateFish");
    expect(it_.intent.alpha).toBe("replace");
    expect(it_.intent.parameters.fish).toEqual({ type: "string", required: true });
  });

  it("вложенные path params /users/{userId}/posts/{postId} — все попадают в parameters", () => {
    const it_ = pathToIntent("GET", "/users/{userId}/posts/{postId}", {});
    expect(it_.intent.parameters.userId).toEqual({ type: "string", required: true });
    expect(it_.intent.parameters.postId).toEqual({ type: "string", required: true });
  });

  it("native IDF format (Phase I): non-{id} DELETE сохраняет particles.effects[0].op=remove", () => {
    const it_ = pathToIntent("DELETE", "/artworks/{artwork}", {});
    expect(it_.intent.particles?.effects?.[0]).toEqual({ target: "Artwork", op: "remove" });
  });

  it("endpoint path конвертирует все {param} в :param", () => {
    const it_ = pathToIntent("GET", "/users/{userId}/posts/{postId}", {});
    expect(it_.intent.endpoint.path).toBe("/users/:userId/posts/:postId");
  });
});

describe("detectActionEndpoint — G-K-2 (action verbs, не entity)", () => {
  it("Keycloak: /users/{user}/reset-password → User + resetPassword", () => {
    expect(detectActionEndpoint("/admin/realms/{realm}/users/{user}/reset-password")).toEqual({
      parentEntity: "User",
      actionSegment: "reset-password",
      actionName: "resetPassword",
    });
  });

  it("Keycloak: /authentication/executions/{id}/lower-priority → Execution + lowerPriority", () => {
    expect(detectActionEndpoint("/admin/realms/{realm}/authentication/executions/{id}/lower-priority")).toEqual({
      parentEntity: "Execution",
      actionSegment: "lower-priority",
      actionName: "lowerPriority",
    });
  });

  it("Keycloak: /users/{user}/logout → User + logout", () => {
    expect(detectActionEndpoint("/admin/realms/{realm}/users/{user}/logout")).toEqual({
      parentEntity: "User",
      actionSegment: "logout",
      actionName: "logout",
    });
  });

  it("plural collection role-mappings НЕ action → null", () => {
    expect(detectActionEndpoint("/admin/realms/{realm}/users/{user}/role-mappings")).toBeNull();
  });

  it("plural collection credentials НЕ action → null", () => {
    expect(detectActionEndpoint("/admin/realms/{realm}/users/{user}/credentials")).toBeNull();
  });

  it("top-level collection не action: /tasks → null", () => {
    expect(detectActionEndpoint("/tasks")).toBeNull();
  });

  it("no trailing {param} before action: /tasks/process → null", () => {
    expect(detectActionEndpoint("/tasks/process")).toBeNull();
  });

  it("approve (из verb-list) detected: /tasks/{id}/approve", () => {
    expect(detectActionEndpoint("/tasks/{id}/approve")).toEqual({
      parentEntity: "Task",
      actionSegment: "approve",
      actionName: "approve",
    });
  });

  it("kebab с несколькими дефисами: test-nodes-available → testNodesAvailable", () => {
    expect(detectActionEndpoint("/clients/{id}/test-nodes-available")).toEqual({
      parentEntity: "Client",
      actionSegment: "test-nodes-available",
      actionName: "testNodesAvailable",
    });
  });
});

describe("pathToIntent — action-endpoints integration", () => {
  it("POST /users/{user}/reset-password: target=User, name=resetPasswordUser, alpha=replace", () => {
    const it_ = pathToIntent(
      "POST",
      "/admin/realms/{realm}/users/{user}/reset-password",
      {},
    );
    expect(it_.intent.target).toBe("User");
    expect(it_.name).toBe("resetPasswordUser");
    expect(it_.intent.alpha).toBe("replace");
  });

  it("POST /clients/{id}/test-nodes-available: target=Client, не TestNodesAvailable", () => {
    const it_ = pathToIntent("POST", "/clients/{id}/test-nodes-available", {});
    expect(it_.intent.target).toBe("Client");
    expect(it_.name).toBe("testNodesAvailableClient");
    expect(it_.intent.alpha).toBe("replace");
  });

  it("POST /users/{user}/credentials (plural) — target=Credential (sub-collection singular), не User", () => {
    // "credentials" не в verb-list → detectActionEndpoint = null → legacy
    // entity-extraction: entity = singularize("credentials") = "Credential".
    // Это корректное sub-collection-create поведение.
    const it_ = pathToIntent(
      "POST",
      "/admin/realms/{realm}/users/{user}/credentials",
      {},
    );
    expect(it_.intent.target).toBe("Credential");
  });

  it("operation.operationId override'ит name, но target остаётся User", () => {
    const it_ = pathToIntent(
      "POST",
      "/users/{user}/reset-password",
      { operationId: "resetUserPassword" },
    );
    expect(it_.name).toBe("resetUserPassword");
    expect(it_.intent.target).toBe("User");
  });
});

describe("importOpenApi — action-endpoints не материализуются как entities", () => {
  it("reset-password / logout не создают entities", () => {
    const spec = {
      paths: {
        "/realms/{realm}/users/{user}": {
          get: { operationId: "readUser", responses: { 200: { description: "ok" } } },
        },
        "/realms/{realm}/users/{user}/reset-password": {
          post: { operationId: "resetPassword", responses: { 200: { description: "ok" } } },
        },
        "/realms/{realm}/users/{user}/logout": {
          post: { operationId: "logoutUser", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(spec);
    expect(result.entities.User).toBeDefined();
    expect(result.entities.ResetPassword).toBeUndefined();
    expect(result.entities.Logout).toBeUndefined();
    expect(result.intents.resetPassword?.target).toBe("User");
    expect(result.intents.logoutUser?.target).toBe("User");
  });

  it("sub-collection credentials остаётся отдельной entity (не action)", () => {
    const spec = {
      paths: {
        "/users/{user}/credentials": {
          get: { operationId: "listCredentials", responses: { 200: { description: "ok" } } },
          post: { operationId: "createCredential", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(spec);
    expect(result.entities.Credential).toBeDefined();
    expect(result.intents.listCredentials?.target).toBe("Credential");
  });
});

describe("G-K-8 — POST на nested collection → create с α=insert", () => {
  it("POST /realms/{realm}/users: target=User, name=createUser, alpha=insert, creates=User", () => {
    const it_ = pathToIntent("POST", "/admin/realms/{realm}/users", {});
    expect(it_.name).toBe("createUser");
    expect(it_.intent.target).toBe("User");
    expect(it_.intent.alpha).toBe("insert");
    expect(it_.intent.creates).toBe("User");
    expect(it_.intent.particles?.confirmation).toBe("enter");
    expect(it_.intent.particles?.effects?.[0]).toEqual({ target: "User", op: "insert" });
  });

  it("POST /realms/{realm}/groups → createGroup", () => {
    const it_ = pathToIntent("POST", "/admin/realms/{realm}/groups", {});
    expect(it_.name).toBe("createGroup");
    expect(it_.intent.target).toBe("Group");
    expect(it_.intent.alpha).toBe("insert");
  });

  it("POST /realms/{realm}/identity-providers → createIdentityProvider (plural через dash)", () => {
    const it_ = pathToIntent(
      "POST",
      "/admin/realms/{realm}/identity-providers",
      {},
    );
    expect(it_.name).toBe("createIdentityProvider");
    expect(it_.intent.target).toBe("IdentityProvider");
    expect(it_.intent.alpha).toBe("insert");
  });

  it("POST /tasks/{id}/custom-endpoint (non-plural, non-verb) — legacy replace, не create", () => {
    const it_ = pathToIntent("POST", "/tasks/{id}/custom-endpoint", {});
    expect(it_.intent.alpha).toBe("replace");
    expect(it_.intent.creates).toBeUndefined();
  });

  it("POST /tasks (top-level) → createTask (существующее поведение, не задето)", () => {
    const it_ = pathToIntent("POST", "/tasks", {});
    expect(it_.name).toBe("createTask");
    expect(it_.intent.alpha).toBe("insert");
  });

  it("operationId override'ит name, но alpha/creates сохраняются для R1", () => {
    const it_ = pathToIntent(
      "POST",
      "/realms/{realm}/users",
      { operationId: "usersUser" },
    );
    expect(it_.name).toBe("usersUser");
    expect(it_.intent.target).toBe("User");
    expect(it_.intent.alpha).toBe("insert");
    expect(it_.intent.creates).toBe("User");
  });

  it("opts.collectionPostAsCreate=false — legacy behavior (back-compat)", () => {
    const it_ = pathToIntent(
      "POST",
      "/admin/realms/{realm}/users",
      {},
      { collectionPostAsCreate: false },
    );
    expect(it_.intent.alpha).toBe("replace");
    expect(it_.intent.creates).toBeUndefined();
    expect(it_.name).toBe("usersUser");
  });
});

describe("importOpenApi — collection-POST-as-create integration", () => {
  const spec = {
    paths: {
      "/admin/realms/{realm}/users": {
        get: { operationId: "listUsers", responses: { 200: { description: "ok" } } },
        post: { operationId: "usersUser", responses: { 201: { description: "created" } } },
      },
      "/admin/realms/{realm}/groups": {
        post: { responses: { 201: { description: "created" } } },
      },
    },
  };

  it("POST intent.alpha=insert + creates=Entity — R1 catalog-rule работает", () => {
    const result = importOpenApi(spec);
    expect(result.intents.usersUser?.alpha).toBe("insert");
    expect(result.intents.usersUser?.creates).toBe("User");
    expect(result.intents.usersUser?.target).toBe("User");
    expect(result.intents.createGroup?.alpha).toBe("insert");
    expect(result.intents.createGroup?.creates).toBe("Group");
  });

  it("opts.collectionPostAsCreate=false — legacy behavior", () => {
    const result = importOpenApi(spec, { collectionPostAsCreate: false });
    expect(result.intents.usersUser?.alpha).toBe("replace");
    expect(result.intents.usersUser?.creates).toBeUndefined();
  });
});
