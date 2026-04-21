import { describe, it, expect } from "vitest";
import { buildOntology } from "../src/index.js";

describe("buildOntology", () => {
  it("собирает full ontology из dump'а с 2 tables + FK", () => {
    const dump = {
      tables: [
        {
          table_name: "users",
          columns: [
            { column_name: "id", data_type: "uuid", is_nullable: "NO", column_default: null, character_maximum_length: null },
            { column_name: "email", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
          ],
          primary_key: ["id"],
        },
        {
          table_name: "tasks",
          columns: [
            { column_name: "id", data_type: "uuid", is_nullable: "NO", column_default: null, character_maximum_length: null },
            { column_name: "user_id", data_type: "uuid", is_nullable: "NO", column_default: null, character_maximum_length: null },
            { column_name: "title", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
          ],
          primary_key: ["id"],
        },
      ],
      foreign_keys: [
        { table: "tasks", column: "user_id", ref_table: "users", ref_column: "id" },
      ],
    };

    const ontology = buildOntology(dump);

    expect(ontology.entities.User).toBeDefined();
    expect(ontology.entities.Task).toBeDefined();
    expect(ontology.entities.Task.relations.user_id.entity).toBe("User");
    expect(ontology.entities.Task.ownerField).toBe("user_id");
    expect(ontology.entities.User.fields.email.role).toBe("contact");

    expect(ontology.intents.createUser).toBeDefined();
    expect(ontology.intents.createTask).toBeDefined();
    expect(ontology.intents.listTask).toBeDefined();

    expect(ontology.name).toBe("default");
    expect(ontology.roles.owner).toEqual({ base: "owner" });
  });
});
