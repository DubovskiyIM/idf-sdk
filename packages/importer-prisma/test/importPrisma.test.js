import { describe, it, expect } from "vitest";
import { importPrisma } from "../src/index.js";

describe("importPrisma integration", () => {
  it("full schema с User + Post + relation → ontology", () => {
    const source = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
  posts Post[]
  createdAt DateTime @default(now())
}

model Post {
  id       String @id @default(cuid())
  title    String
  status   String @default("draft")
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
  price    Decimal
  updatedAt DateTime @updatedAt
}
`;

    const ontology = importPrisma(source);

    // entities
    expect(Object.keys(ontology.entities).sort()).toEqual(["Post", "User"]);

    // User fields
    expect(ontology.entities.User.fields.email.role).toBe("contact");
    expect(ontology.entities.User.fields.id.readOnly).toBe(true);
    expect(ontology.entities.User.fields.createdAt.role).toBe("date-witness");
    expect(ontology.entities.User.fields.createdAt.readOnly).toBe(true);

    // Post fields
    expect(ontology.entities.Post.fields.title.role).toBe("primary-title");
    expect(ontology.entities.Post.fields.price.role).toBe("money");
    expect(ontology.entities.Post.fields.status.default).toBe("draft");
    expect(ontology.entities.Post.fields.updatedAt.readOnly).toBe(true);

    // relation
    expect(ontology.entities.Post.relations.authorId).toEqual({
      entity: "User",
      kind: "belongs-to",
    });
    expect(ontology.entities.Post.ownerField).toBe("authorId");

    // seed CRUD intents
    expect(ontology.intents.createUser).toBeDefined();
    expect(ontology.intents.createPost).toBeDefined();
    expect(ontology.intents.listUser).toBeDefined();
    expect(ontology.intents.updatePost.alpha).toBe("replace");
    expect(ontology.intents.removeUser.alpha).toBe("remove");
  });
});
