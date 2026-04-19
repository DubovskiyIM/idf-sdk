import { describe, it, expect } from "vitest";
import { collectNearMissWitnesses, groupNearMissByRule } from "./nearMissWitnesses.js";

describe("collectNearMissWitnesses", () => {
  describe("R3 — mutator-count below threshold", () => {
    it("выдаёт near-miss для entity с ровно 1 mutator", () => {
      const INTENTS = {
        add_category: { creates: "Category", particles: { effects: [{ α: "create", target: "category" }] } },
      };
      const ONTOLOGY = { entities: { Category: { fields: { name: { type: "text" } } } } };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r3 = nms.find(n => n.ruleId === "R3" && n.entity === "Category");
      expect(r3).toBeDefined();
      expect(r3.basis).toBe("crystallize-rule-near-miss");
      expect(r3.actual.mutatorCount).toBe(1);
      expect(r3.rationale).toContain("Category");
      expect(r3.suggestion).toContain("category.");
    });

    it("не выдаёт R3 near-miss при ≥2 mutators (R3 сработал)", () => {
      const INTENTS = {
        add_listing:  { creates: "Listing", particles: { effects: [{ α: "create",  target: "listing" }] } },
        edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
      };
      const ONTOLOGY = { entities: { Listing: { fields: { title: { type: "text" } } } } };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r3 = nms.find(n => n.ruleId === "R3" && n.entity === "Listing");
      expect(r3).toBeUndefined();
    });

    it("не выдаёт R3 near-miss при 0 mutators (не релевантно)", () => {
      const INTENTS = {};
      const ONTOLOGY = { entities: { Unused: { fields: {} } } };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r3 = nms.find(n => n.ruleId === "R3" && n.entity === "Unused");
      expect(r3).toBeUndefined();
    });
  });

  describe("R1b — isolated entity", () => {
    it("выдаёт near-miss для изолированной сущности", () => {
      const INTENTS = {
        add_task: { creates: "Task", particles: { effects: [{ α: "create", target: "task" }] } },
      };
      const ONTOLOGY = {
        entities: {
          Task: { fields: { title: { type: "text" } } },
          Isolated: { fields: { name: { type: "text" } } },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r1b = nms.find(n => n.ruleId === "R1b" && n.entity === "Isolated");
      expect(r1b).toBeDefined();
      expect(r1b.reason).toBe("isolated-entity");
      expect(r1b.suggestion).toContain("reference");
    });

    it("НЕ выдаёт R1b near-miss если entity helped by kind:reference", () => {
      const INTENTS = {};
      const ONTOLOGY = {
        entities: {
          Asset: { kind: "reference", fields: {} },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r1b = nms.find(n => n.ruleId === "R1b" && n.entity === "Asset");
      expect(r1b).toBeUndefined();
    });

    it("НЕ выдаёт R1b near-miss если referenced через foreignKey", () => {
      const INTENTS = {
        add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      };
      const ONTOLOGY = {
        entities: {
          Listing:  { fields: { sellerId: { type: "entityRef" } } },
          Seller:   { fields: { name: { type: "text" } } },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r1b = nms.find(n => n.ruleId === "R1b" && n.entity === "Seller");
      expect(r1b).toBeUndefined();
    });
  });

  describe("R7 — owner candidate без ownerField", () => {
    it("выдаёт near-miss когда entity имеет userId но не ownerField", () => {
      const INTENTS = {
        add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      };
      const ONTOLOGY = {
        entities: {
          Listing: {
            fields: { userId: { type: "entityRef" }, title: { type: "text" } },
            // ownerField intentionally missing
          },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r7 = nms.find(n => n.ruleId === "R7" && n.entity === "Listing");
      expect(r7).toBeDefined();
      expect(r7.suggestion).toContain("ownerField");
    });

    it("НЕ выдаёт R7 near-miss если ownerField уже объявлен", () => {
      const INTENTS = {
        add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      };
      const ONTOLOGY = {
        entities: {
          Listing: { ownerField: "userId", fields: { userId: { type: "entityRef" } } },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r7 = nms.find(n => n.ruleId === "R7" && n.entity === "Listing");
      expect(r7).toBeUndefined();
    });

    it("НЕ выдаёт R7 near-miss если нет owner-candidate поля", () => {
      const INTENTS = {
        add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      };
      const ONTOLOGY = {
        entities: { Listing: { fields: { title: { type: "text" } } } },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r7 = nms.find(n => n.ruleId === "R7" && n.entity === "Listing");
      expect(r7).toBeUndefined();
    });
  });

  describe("R10 — role без scope", () => {
    it("выдаёт near-miss для agent-роли без scope", () => {
      const INTENTS = {};
      const ONTOLOGY = {
        entities: {},
        roles: {
          advisor: { base: "agent" },  // no scope
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r10 = nms.find(n => n.ruleId === "R10" && n.role === "advisor");
      expect(r10).toBeDefined();
      expect(r10.suggestion).toContain("scope");
    });

    it("НЕ выдаёт R10 near-miss для owner-роли без scope (нормально)", () => {
      const INTENTS = {};
      const ONTOLOGY = {
        entities: {},
        roles: {
          customer: { base: "owner" },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r10 = nms.find(n => n.ruleId === "R10");
      expect(r10).toBeUndefined();
    });

    it("НЕ выдаёт R10 near-miss если scope объявлен", () => {
      const INTENTS = {};
      const ONTOLOGY = {
        entities: {},
        roles: {
          advisor: {
            base: "agent",
            scope: { User: { via: "assignments", viewerField: "a", joinField: "c", localField: "id" } },
          },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      const r10 = nms.find(n => n.ruleId === "R10");
      expect(r10).toBeUndefined();
    });
  });

  describe("groupNearMissByRule", () => {
    it("группирует по ruleId", () => {
      const nms = [
        { ruleId: "R3", entity: "A" },
        { ruleId: "R3", entity: "B" },
        { ruleId: "R7", entity: "A" },
      ];
      const grouped = groupNearMissByRule(nms);
      expect(Object.keys(grouped).sort()).toEqual(["R3", "R7"]);
      expect(grouped.R3.length).toBe(2);
      expect(grouped.R7.length).toBe(1);
    });

    it("пустой input → пустой объект", () => {
      expect(groupNearMissByRule([])).toEqual({});
      expect(groupNearMissByRule(null)).toEqual({});
    });
  });

  describe("edge cases", () => {
    it("пустые inputs — возвращает пустой массив", () => {
      expect(collectNearMissWitnesses({}, {})).toEqual([]);
      expect(collectNearMissWitnesses(null, null)).toEqual([]);
    });

    it("assignment-entities исключены из R1b/R3 анализа", () => {
      const INTENTS = {};
      const ONTOLOGY = {
        entities: {
          Assignment: { kind: "assignment", fields: { a: { type: "text" } } },
        },
      };
      const nms = collectNearMissWitnesses(INTENTS, ONTOLOGY);
      expect(nms.filter(n => n.entity === "Assignment")).toEqual([]);
    });
  });
});
