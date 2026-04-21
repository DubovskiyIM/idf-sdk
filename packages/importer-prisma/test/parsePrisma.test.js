import { describe, it, expect } from "vitest";
import { parsePrisma } from "../src/parsePrisma.js";

describe("parsePrisma", () => {
  it("извлекает models с name и properties", () => {
    const source = `
model User {
  id    String @id
  email String @unique
}

model Post {
  id String @id
}
`;
    const { models } = parsePrisma(source);
    expect(models.map((m) => m.name)).toEqual(["User", "Post"]);
  });

  it("skip break-entries из AST", () => {
    const source = `
      model User {
        id String @id
      }

      model Post {
        id String @id
      }
    `;
    const { models } = parsePrisma(source);
    expect(models).toHaveLength(2);
  });

  it("fields извлекаются с name/fieldType/array/optional/attributes", () => {
    const source = `
      model User {
        id    String @id
        email String @unique
        age   Int?
        tags  String[]
      }
    `;
    const { models } = parsePrisma(source);
    const user = models[0];
    const byName = new Map(user.fields.map((f) => [f.name, f]));
    expect(byName.get("id").fieldType).toBe("String");
    expect(byName.get("age").optional).toBe(true);
    expect(byName.get("tags").array).toBe(true);
  });

  it("attribute args извлекаются (например @default(value))", () => {
    const source = `
      model User {
        id String @id @default(cuid())
        role String @default("user")
      }
    `;
    const { models } = parsePrisma(source);
    const role = models[0].fields.find((f) => f.name === "role");
    expect(role.attributes.some((a) => a.name === "default")).toBe(true);
  });
});
