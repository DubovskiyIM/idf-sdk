import { describe, it, expect } from "vitest";
import { newDb } from "pg-mem";
import { introspect } from "../src/introspect.js";
import { buildOntology } from "../src/index.js";

describe("integration: pg-mem end-to-end", () => {
  it("читает schema и собирает ontology для users + tasks", async () => {
    const db = newDb();
    const { Client } = db.adapters.createPg();
    const client = new Client();
    await client.connect();

    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const dump = await introspect(client);
    const ontology = buildOntology(dump);

    await client.end();

    expect(Object.keys(ontology.entities).sort()).toEqual(["Task", "User"]);
    expect(ontology.entities.Task.ownerField).toBe("user_id");
    expect(ontology.entities.Task.fields.title.role).toBe("primary-title");
    expect(ontology.entities.Task.fields.created_at.role).toBe("date-witness");
    expect(ontology.intents.createTask).toBeDefined();
    // FK relation (pg-mem может возвращать пустое)
    if (ontology.entities.Task.relations) {
      expect(ontology.entities.Task.relations.user_id?.entity).toBe("User");
    } else {
      console.warn("pg-mem не вернул FK через information_schema — проверить на real Postgres");
    }
  });
});
