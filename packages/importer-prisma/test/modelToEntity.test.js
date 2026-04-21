import { describe, it, expect } from "vitest";
import { modelToEntity } from "../src/modelToEntity.js";

const field = (props) => ({
  name: "x", fieldType: "String", array: false, optional: false, attributes: [], ...props,
});

describe("modelToEntity", () => {
  const modelNames = new Set(["User", "Post"]);

  it("scalar fields → entity.fields (relations skipped)", () => {
    const model = {
      name: "Post",
      fields: [
        field({ name: "id", attributes: [{ type: "attribute", name: "id" }] }),
        field({ name: "title" }),
        field({ name: "authorId" }),
        field({ name: "author", fieldType: "User", optional: true }),
      ],
      blockAttributes: [],
    };

    const e = modelToEntity(model, modelNames);
    expect(Object.keys(e.fields).sort()).toEqual(["authorId", "id", "title"]);
    expect(e.fields.author).toBeUndefined();
  });

  it("ownerField inferрится из userId/authorId", () => {
    const model = {
      name: "Post",
      fields: [
        field({ name: "id", attributes: [{ type: "attribute", name: "id" }] }),
        field({ name: "authorId" }),
      ],
      blockAttributes: [],
    };
    expect(modelToEntity(model, modelNames).ownerField).toBe("authorId");
  });

  it("@@map не меняет entity.name (для IDF остаётся Prisma-имя)", () => {
    const model = {
      name: "Post",
      fields: [field({ name: "id", attributes: [{ type: "attribute", name: "id" }] })],
      blockAttributes: [
        {
          type: "attribute",
          name: "map",
          kind: "object",
          args: [{ type: "attributeArgument", value: '"posts"' }],
        },
      ],
    };
    const e = modelToEntity(model, modelNames);
    expect(e.name).toBe("Post"); // entity.name = Prisma model name, независимо от @@map
  });

  it("kind: internal по умолчанию", () => {
    const model = {
      name: "User",
      fields: [field({ name: "id", attributes: [{ type: "attribute", name: "id" }] })],
      blockAttributes: [],
    };
    expect(modelToEntity(model, modelNames).kind).toBe("internal");
  });
});
