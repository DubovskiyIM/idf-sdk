import { describe, it, expect } from "vitest";
import { absorbHubChildren } from "./absorbHubChildren.js";

describe("absorbHubChildren", () => {
  const ontology = {
    entities: {
      Pet: { fields: { id: {}, name: {}, ownerId: { type: "entityRef" } } },
      HealthRecord: { fields: { id: {}, petId: { type: "entityRef" }, weight: {} } },
      Vaccination: { fields: { id: {}, petId: { type: "entityRef" }, vaccineName: {} } },
    },
  };
  const projections = {
    pet_list: { kind: "catalog", mainEntity: "Pet" },
    pet_detail: { kind: "detail", mainEntity: "Pet" },
    health_record_list: { kind: "catalog", mainEntity: "HealthRecord" },
    vaccination_list: { kind: "catalog", mainEntity: "Vaccination" },
  };

  it("помечает child-каталоги absorbedBy и обогащает hub detail hubSections", () => {
    const result = absorbHubChildren(projections, ontology);
    expect(result.health_record_list.absorbedBy).toBe("pet_detail");
    expect(result.vaccination_list.absorbedBy).toBe("pet_detail");
    expect(result.pet_detail.hubSections).toEqual([
      { projectionId: "health_record_list", foreignKey: "petId", entity: "HealthRecord" },
      { projectionId: "vaccination_list", foreignKey: "petId", entity: "Vaccination" },
    ]);
  });

  it("не абсорбирует если меньше 2 child-каталогов (порог иерархии)", () => {
    const minimal = {
      pet_list: { kind: "catalog", mainEntity: "Pet" },
      pet_detail: { kind: "detail", mainEntity: "Pet" },
      health_record_list: { kind: "catalog", mainEntity: "HealthRecord" },
    };
    const result = absorbHubChildren(minimal, ontology);
    expect(result.health_record_list.absorbedBy).toBeUndefined();
    expect(result.pet_detail.hubSections).toBeUndefined();
  });

  it("не мутирует вход", () => {
    const before = JSON.stringify(projections);
    absorbHubChildren(projections, ontology);
    expect(JSON.stringify(projections)).toBe(before);
  });

  it("уважает явный absorbed: false", () => {
    const p = {
      ...projections,
      health_record_list: { ...projections.health_record_list, absorbed: false },
    };
    const result = absorbHubChildren(p, ontology);
    expect(result.health_record_list.absorbedBy).toBeUndefined();
  });

  it("пропускает entity без detail-проекции (нет hub-якоря)", () => {
    const p = { ...projections };
    delete p.pet_detail;
    const result = absorbHubChildren(p, ontology);
    expect(result.health_record_list.absorbedBy).toBeUndefined();
  });
});

describe("absorbHubChildren — best-parent heuristic (G-K-11)", () => {
  // Keycloak-подобная топология: User имеет FK и на Realm (realmId), и на
  // Role (roleId — synthetic path FK от /roles/{roleId}/users). Realm —
  // «hubbier» (много child'ов), Role — меньше. User должен ехать в Realm,
  // даже если Role processed earlier в Object.entries.
  const ontology = {
    entities: {
      Realm: { fields: { id: { type: "id" } } },
      Role:  { fields: { id: { type: "id" }, realmId: { kind: "foreignKey", references: "Realm" } } },
      User:  { fields: {
        id: { type: "id" },
        roleId: { kind: "foreignKey", references: "Role" },
        realmId: { kind: "foreignKey", references: "Realm" },
      } },
      Group: { fields: { id: { type: "id" }, realmId: { kind: "foreignKey", references: "Realm" } } },
      Client: { fields: { id: { type: "id" }, realmId: { kind: "foreignKey", references: "Realm" } } },
    },
  };
  const projections = {
    realm_list: { kind: "catalog", mainEntity: "Realm" },
    realm_detail: { kind: "detail", mainEntity: "Realm" },
    role_list: { kind: "catalog", mainEntity: "Role" },
    role_detail: { kind: "detail", mainEntity: "Role" },
    user_list: { kind: "catalog", mainEntity: "User" },
    user_detail: { kind: "detail", mainEntity: "User" },
    group_list: { kind: "catalog", mainEntity: "Group" },
    client_list: { kind: "catalog", mainEntity: "Client" },
  };

  it("multi-parent child → hubbier wins (User → Realm.detail, не Role.detail)", () => {
    const result = absorbHubChildren(projections, ontology);
    // Realm candidates: Role, User, Group, Client = 4
    // Role candidates:  User = 1 (<MIN, должен выпасть)
    expect(result.user_list.absorbedBy).toBe("realm_detail");
    expect(result.group_list.absorbedBy).toBe("realm_detail");
    expect(result.client_list.absorbedBy).toBe("realm_detail");
  });

  it("parent, потерявший child'ов ниже threshold после redistribution — skipped", () => {
    const result = absorbHubChildren(projections, ontology);
    // Role после redistribution получает 0 children (User ушёл к Realm).
    // role_detail.hubSections не должен существовать.
    expect(result.role_detail.hubSections).toBeUndefined();
  });

  it("Realm.detail собирает все 4 absorbed child-catalog'а", () => {
    const result = absorbHubChildren(projections, ontology);
    const hubSections = result.realm_detail.hubSections;
    expect(hubSections).toBeDefined();
    const entities = hubSections.map(s => s.entity);
    expect(entities).toContain("Role");
    expect(entities).toContain("User");
    expect(entities).toContain("Group");
    expect(entities).toContain("Client");
  });

  it("tiebreak: равный score → alphabetical parent wins (stable)", () => {
    // A и B — оба parent'а для X и Y (counts одинаковы).
    const tieOntology = {
      entities: {
        A: { fields: { id: { type: "id" } } },
        B: { fields: { id: { type: "id" } } },
        X: { fields: {
          id: { type: "id" },
          aId: { kind: "foreignKey", references: "A" },
          bId: { kind: "foreignKey", references: "B" },
        } },
        Y: { fields: {
          id: { type: "id" },
          aId: { kind: "foreignKey", references: "A" },
          bId: { kind: "foreignKey", references: "B" },
        } },
      },
    };
    const tieProjs = {
      a_list: { kind: "catalog", mainEntity: "A" },
      a_detail: { kind: "detail", mainEntity: "A" },
      b_list: { kind: "catalog", mainEntity: "B" },
      b_detail: { kind: "detail", mainEntity: "B" },
      x_list: { kind: "catalog", mainEntity: "X" },
      y_list: { kind: "catalog", mainEntity: "Y" },
    };
    const result = absorbHubChildren(tieProjs, tieOntology);
    // Alphabetical: "A" < "B" → X/Y едут в A
    expect(result.x_list.absorbedBy).toBe("a_detail");
    expect(result.y_list.absorbedBy).toBe("a_detail");
    expect(result.b_detail.hubSections).toBeUndefined();
  });

  it("author absorbed:false уважается даже под best-parent", () => {
    const p = {
      ...projections,
      user_list: { ...projections.user_list, absorbed: false },
    };
    const result = absorbHubChildren(p, ontology);
    expect(result.user_list.absorbedBy).toBeUndefined();
    // Realm всё равно hub — 3 других child'а (Role/Group/Client) ≥ MIN
    expect(result.realm_detail.hubSections?.length).toBe(3);
  });
});
