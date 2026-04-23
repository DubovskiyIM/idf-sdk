// G-K-9 (Keycloak dogfood, 2026-04-23): crystallizeV2 теряет
// `mainEntity` и `entities` в построенных artifact'ах. Это ломает
// downstream R8 hub-absorption host-side checks и любую host-логику,
// которая фильтрует/группирует артефакты по mainEntity.
//
// Repro:
//   const projections = { user_detail: { kind: "detail", mainEntity: "User", ... } };
//   const arts = crystallizeV2(intents, projections, ontology);
//   arts.user_detail.mainEntity === undefined  // ❌ должно быть "User"
//
// Связанный gap-каталог:
// idf/.worktrees/keycloak-dogfood/docs/keycloak-gaps.md G-K-9
import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

const ONTOLOGY = {
  entities: {
    Realm: {
      name: "Realm",
      kind: "internal",
      fields: { id: { type: "text" }, realm: { type: "text" } },
    },
    User: {
      name: "User",
      kind: "internal",
      fields: {
        id: { type: "text" },
        username: { type: "text" },
        realmId: { type: "entityRef", references: "Realm", kind: "foreignKey" },
      },
    },
  },
};

const INTENTS = {
  createUser: { name: "Create user", target: "User", creates: "User", alpha: "insert", particles: { entities: ["User"] } },
  readUser:   { name: "Read user",   target: "User", particles: { entities: ["User"] } },
  updateUser: { name: "Update user", target: "User", alpha: "replace", particles: { entities: ["User"], effects: [{ op: "set", target: "User.username" }] } },
  removeUser: { name: "Remove user", target: "User", alpha: "remove",  particles: { entities: ["User"], effects: [{ op: "remove", target: "User" }] } },
  createRealm: { name: "Create realm", target: "Realm", creates: "Realm", alpha: "insert", particles: { entities: ["Realm"] } },
  readRealm:   { name: "Read realm",   target: "Realm", particles: { entities: ["Realm"] } },
};

const PROJECTIONS = {
  user_list:    { kind: "catalog", mainEntity: "User",  entities: ["User"],  witnesses: [] },
  user_detail:  { kind: "detail",  mainEntity: "User",  entities: ["User"],  witnesses: [] },
  realm_list:   { kind: "catalog", mainEntity: "Realm", entities: ["Realm"], witnesses: [] },
  realm_detail: { kind: "detail",  mainEntity: "Realm", entities: ["Realm"], witnesses: [] },
};

describe("crystallizeV2: preserve mainEntity + entities в artifact (G-K-9)", () => {
  const artifacts = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "test");

  it("artifact.mainEntity сохраняется для detail-проекций", () => {
    expect(artifacts.user_detail).toBeDefined();
    expect(artifacts.user_detail.mainEntity).toBe("User");
    expect(artifacts.realm_detail.mainEntity).toBe("Realm");
  });

  it("artifact.mainEntity сохраняется для catalog-проекций", () => {
    expect(artifacts.user_list).toBeDefined();
    expect(artifacts.user_list.mainEntity).toBe("User");
    expect(artifacts.realm_list.mainEntity).toBe("Realm");
  });

  it("artifact.entities массив сохраняется (нужен для multi-entity feed/dashboard)", () => {
    expect(Array.isArray(artifacts.user_detail.entities)).toBe(true);
    expect(artifacts.user_detail.entities).toContain("User");
    expect(artifacts.realm_list.entities).toContain("Realm");
  });

  it("R8 host-side check: можно построить detailByEntity index из artifacts", () => {
    // Reproduces absorbHubChildren-style host check (что Keycloak пытался делать).
    const detailByEntity = {};
    for (const [id, a] of Object.entries(artifacts)) {
      if (a.archetype === "detail" && a.mainEntity) {
        detailByEntity[a.mainEntity] = id;
      }
    }
    expect(detailByEntity.User).toBe("user_detail");
    expect(detailByEntity.Realm).toBe("realm_detail");
  });

  it("form-архетип (синтетический edit) тоже несёт mainEntity родительского detail", () => {
    // Edit-projection user_detail_edit генерируется crystallize автоматически.
    const editArt = artifacts.user_detail_edit;
    if (editArt) {
      // mainEntity edit-формы = mainEntity исходного detail
      expect(editArt.mainEntity).toBe("User");
    }
  });
});
