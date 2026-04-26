import { describe, it, expect } from "vitest";
import { applyEffect, getCollectionType } from "./snapshot.js";

describe("applyEffect (extracted helper)", () => {
  it("add — создаёт сущность в коллекции", () => {
    const collections = {};
    const ef = {
      id: "e1",
      target: "user",
      alpha: "add",
      context: { id: "u1", name: "Alice" },
    };
    applyEffect(ef, collections, {});
    expect(collections.user).toEqual({ u1: { id: "u1", name: "Alice" } });
  });

  it("replace — обновляет поле существующей сущности", () => {
    const collections = { user: { u1: { id: "u1", name: "Alice" } } };
    const ef = {
      id: "e2",
      target: "user.name",
      alpha: "replace",
      context: { id: "u1" },
      value: "Bob",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1.name).toBe("Bob");
  });

  it("replace — upsert если сущности нет (partial entity из {id, field})", () => {
    const collections = {};
    const ef = {
      id: "e2",
      target: "user.name",
      alpha: "replace",
      context: { id: "u1" },
      value: "Bob",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1).toEqual({ id: "u1", name: "Bob" });
  });

  it("remove — удаляет сущность", () => {
    const collections = { user: { u1: { id: "u1" } } };
    const ef = {
      id: "e3",
      target: "user",
      alpha: "remove",
      context: { id: "u1" },
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1).toBeUndefined();
  });

  it("scope=presentation — игнорируется (не мутирует)", () => {
    const collections = { user: { u1: { id: "u1", name: "A" } } };
    const ef = {
      id: "e4",
      target: "user.name",
      alpha: "replace",
      scope: "presentation",
      context: { id: "u1" },
      value: "B",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1.name).toBe("A");
  });

  it("target=drafts — игнорируется (черновики обрабатываются отдельно)", () => {
    const collections = {};
    const ef = {
      id: "e5",
      target: "drafts",
      alpha: "add",
      context: { id: "d1" },
    };
    applyEffect(ef, collections, {});
    expect(collections).toEqual({});
  });

  it("batch — разворачивает массив под-эффектов", () => {
    const collections = {};
    const ef = {
      id: "ebatch",
      target: "user",
      alpha: "batch",
      value: [
        { id: "s1", target: "user", alpha: "add", context: { id: "u1", name: "A" } },
        { id: "s2", target: "user", alpha: "add", context: { id: "u2", name: "B" } },
      ],
    };
    applyEffect(ef, collections, {});
    expect(Object.keys(collections.user)).toEqual(["u1", "u2"]);
  });

  it("getCollectionType использует typeMap для plural", () => {
    expect(getCollectionType("user", { user: "users" })).toBe("users");
    expect(getCollectionType("user.name", { user: "users" })).toBe("users");
    expect(getCollectionType("widget", {})).toBe("widget");
  });
});
