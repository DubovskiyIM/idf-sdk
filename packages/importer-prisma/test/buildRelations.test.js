import { describe, it, expect } from "vitest";
import { buildRelations } from "../src/buildRelations.js";

describe("buildRelations", () => {
  it("@relation(fields: [authorId], references: [id]) → Post.relations.authorId → User", () => {
    const models = [
      {
        name: "User",
        fields: [{ name: "id", fieldType: "String", array: false, optional: false, attributes: [{ type: "attribute", name: "id" }] }],
      },
      {
        name: "Post",
        fields: [
          { name: "id", fieldType: "String", array: false, optional: false, attributes: [{ type: "attribute", name: "id" }] },
          { name: "authorId", fieldType: "String", array: false, optional: false, attributes: [] },
          {
            name: "author",
            fieldType: "User",
            array: false,
            optional: true,
            attributes: [
              {
                type: "attribute",
                name: "relation",
                args: [
                  { type: "attributeArgument", value: { type: "keyValue", key: "fields", value: { type: "array", args: [{ value: "authorId" }] } } },
                  { type: "attributeArgument", value: { type: "keyValue", key: "references", value: { type: "array", args: [{ value: "id" }] } } },
                ],
              },
            ],
          },
        ],
      },
    ];

    const entities = {
      User: { name: "User", fields: {} },
      Post: { name: "Post", fields: { authorId: { type: "string" }, id: { type: "string" } } },
    };

    buildRelations(entities, models);

    expect(entities.Post.relations).toEqual({
      authorId: { entity: "User", kind: "belongs-to" },
    });
  });

  it("игнорирует list-relations (Post[] на User)", () => {
    const models = [
      {
        name: "User",
        fields: [
          { name: "id", fieldType: "String", array: false, optional: false, attributes: [] },
          { name: "posts", fieldType: "Post", array: true, optional: false, attributes: [] },
        ],
      },
      { name: "Post", fields: [] },
    ];
    const entities = {
      User: { name: "User", fields: {} },
      Post: { name: "Post", fields: {} },
    };

    buildRelations(entities, models);

    expect(entities.User.relations).toBeUndefined();
  });

  it("многокомпонентные FK пропускаются в MVP", () => {
    const models = [
      { name: "User", fields: [] },
      {
        name: "Post",
        fields: [
          {
            name: "author",
            fieldType: "User",
            array: false,
            optional: true,
            attributes: [
              {
                type: "attribute",
                name: "relation",
                args: [
                  { type: "attributeArgument", value: { type: "keyValue", key: "fields", value: { type: "array", args: [{ value: "a" }, { value: "b" }] } } },
                  { type: "attributeArgument", value: { type: "keyValue", key: "references", value: { type: "array", args: [{ value: "x" }, { value: "y" }] } } },
                ],
              },
            ],
          },
        ],
      },
    ];
    const entities = {
      User: { name: "User", fields: {} },
      Post: { name: "Post", fields: {} },
    };

    buildRelations(entities, models);
    expect(entities.Post.relations).toBeUndefined();
  });
});
