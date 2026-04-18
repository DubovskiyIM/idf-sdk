import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

describe("crystallize_v2 hub integration", () => {
  const ontology = {
    entities: {
      Pet: { fields: { id: {}, name: {}, ownerId: { type: "entityRef" } } },
      HealthRecord: { fields: { id: {}, petId: { type: "entityRef" }, weight: {} } },
      Vaccination: { fields: { id: {}, petId: { type: "entityRef" }, vaccineName: {} } },
    },
  };
  const intents = {
    add_pet: {
      creates: "Pet",
      name: "Добавить питомца",
      particles: {
        entities: ["Pet"],
        effects: [{ α: "add", target: "pets" }],
        witnesses: ["name"],
      },
    },
    log_health: {
      creates: "HealthRecord",
      name: "Записать",
      particles: {
        entities: ["HealthRecord"],
        effects: [{ α: "add", target: "healthRecords" }],
        witnesses: ["weight"],
      },
    },
    add_vacc: {
      creates: "Vaccination",
      name: "Привить",
      particles: {
        entities: ["Vaccination"],
        effects: [{ α: "add", target: "vaccinations" }],
        witnesses: ["vaccineName"],
      },
    },
  };
  const projections = {
    pet_list: { kind: "catalog", mainEntity: "Pet", name: "Питомцы" },
    pet_detail: { kind: "detail", mainEntity: "Pet", name: "Питомец" },
    health_list: { kind: "catalog", mainEntity: "HealthRecord", name: "Здоровье" },
    vaccination_list: { kind: "catalog", mainEntity: "Vaccination", name: "Прививки" },
  };

  it("child-catalogs получают absorbedBy, hub detail — hubSections", () => {
    const artifacts = crystallizeV2(intents, projections, ontology, "pet");
    expect(artifacts.health_list.absorbedBy).toBe("pet_detail");
    expect(artifacts.vaccination_list.absorbedBy).toBe("pet_detail");
    expect(artifacts.pet_detail.hubSections).toHaveLength(2);
    expect(artifacts.pet_list.absorbedBy).toBeNull();
  });
});
