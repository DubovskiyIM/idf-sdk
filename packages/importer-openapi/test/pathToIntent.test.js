import { describe, it, expect } from "vitest";
import { pathToIntent, entityNameFromPath } from "../src/pathToIntent.js";

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
