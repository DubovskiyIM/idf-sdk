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
