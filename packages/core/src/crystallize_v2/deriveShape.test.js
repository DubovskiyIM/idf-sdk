import { describe, it, expect } from "vitest";
import { deriveShape } from "./deriveShape.js";

describe("deriveShape", () => {
  const ontology = {
    entities: {
      HealthRecord: { fields: { id: {}, recordDate: { type: "date" }, weight: {} } },
      VetContact: { fields: { id: {}, name: {}, phone: {}, email: {} } },
      Pet: { fields: { id: {}, name: {}, birthDate: { type: "date" } } },
    },
  };

  it("timeline — date-witness + descending sort", () => {
    const proj = {
      kind: "catalog",
      mainEntity: "HealthRecord",
      witnesses: ["recordDate", "weight"],
      sort: "-recordDate",
    };
    const result = deriveShape(proj, ontology);
    expect(result.shape).toBe("timeline");
    expect(result.signals).toContain("date-witness:recordDate");
    expect(result.signals).toContain("descending-sort");
  });

  it("directory — contact fields без даты в сортировке", () => {
    const proj = {
      kind: "catalog",
      mainEntity: "VetContact",
      witnesses: ["name", "phone", "email"],
      sort: "name",
    };
    const result = deriveShape(proj, ontology);
    expect(result.shape).toBe("directory");
    expect(result.signals).toContain("contact-field:phone");
  });

  it("default — обычный catalog без хронологии/контактов", () => {
    const proj = {
      kind: "catalog",
      mainEntity: "Pet",
      witnesses: ["name"],
      sort: "name",
    };
    const result = deriveShape(proj, ontology);
    expect(result.shape).toBe("default");
  });

  it("author-override выигрывает", () => {
    const proj = {
      kind: "catalog",
      mainEntity: "HealthRecord",
      witnesses: ["recordDate"],
      sort: "-recordDate",
      shape: "default",
    };
    expect(deriveShape(proj, ontology).shape).toBe("default");
  });

  it("detail-проекция — всегда default (shape применяется только к catalog/feed)", () => {
    const proj = { kind: "detail", mainEntity: "HealthRecord", witnesses: ["recordDate"] };
    expect(deriveShape(proj, ontology).shape).toBe("default");
  });

  it("catalog без witnesses — default", () => {
    const proj = { kind: "catalog", mainEntity: "Pet" };
    expect(deriveShape(proj, ontology).shape).toBe("default");
  });

  describe("v0.12: date-detection через inferFieldRole", () => {
    it("completedAt (role=occurred) — timeline при descending sort", () => {
      const ont = {
        entities: {
          Task: { fields: { id: {}, completedAt: { type: "datetime" }, title: {} } },
        },
      };
      const proj = {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["completedAt", "title"],
        sort: "-completedAt",
      };
      expect(deriveShape(proj, ont).shape).toBe("timeline");
    });

    it("deadline (role=deadline) — timeline при descending sort", () => {
      const ont = {
        entities: {
          Goal: { fields: { id: {}, deadline: { type: "date" }, title: {} } },
        },
      };
      const proj = {
        kind: "catalog",
        mainEntity: "Goal",
        witnesses: ["title", "deadline"],
        sort: "-deadline",
      };
      expect(deriveShape(proj, ont).shape).toBe("timeline");
    });

    it("createdAt (role=timestamp) — тоже считается date для shape-детекции", () => {
      const ont = {
        entities: {
          Log: { fields: { id: {}, createdAt: { type: "datetime" }, message: {} } },
        },
      };
      const proj = {
        kind: "catalog",
        mainEntity: "Log",
        witnesses: ["createdAt", "message"],
        sort: "-createdAt",
      };
      expect(deriveShape(proj, ont).shape).toBe("timeline");
    });
  });
});
