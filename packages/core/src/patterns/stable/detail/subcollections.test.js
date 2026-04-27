import { describe, it, expect } from "vitest";
import subcollections from "./subcollections.js";

const ontology = {
  entities: {
    Portfolio: { fields: { name: { type: "text" } } },
    Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
    Transaction: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, amount: { type: "number" } } },
  },
};
const intents = [
  { id: "add_position", creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
  { id: "add_tx", creates: "Transaction", particles: { effects: [{ α: "create", target: "transaction" }] } },
];

describe("subcollections.structure.apply", () => {
  it("adds sections for sub-entities", () => {
    const slots = {};
    const context = { ontology, mainEntity: "Portfolio", intents };
    const result = subcollections.structure.apply(slots, context);
    expect(result.sections).toHaveLength(2);
    expect(result.sections.map(s => s.id).sort()).toEqual(["positions", "transactions"]);
  });

  it("idempotent — second call adds nothing", () => {
    const slots = {};
    const context = { ontology, mainEntity: "Portfolio", intents };
    const once = subcollections.structure.apply(slots, context);
    const twice = subcollections.structure.apply(once, context);
    expect(twice.sections).toHaveLength(once.sections.length);
  });

  it("preserves existing sections with same id", () => {
    const slots = { sections: [{ id: "positions", title: "Custom positions", source: "authored" }] };
    const context = { ontology, mainEntity: "Portfolio", intents };
    const result = subcollections.structure.apply(slots, context);
    const positions = result.sections.find(s => s.id === "positions");
    expect(positions.source).toBe("authored");
    expect(positions.title).toBe("Custom positions");
    expect(result.sections.find(s => s.id === "transactions")).toBeDefined();
  });

  it("returns same slots object when nothing to add", () => {
    const slots = { sections: [] };
    const context = { ontology: { entities: { X: {} } }, mainEntity: "X", intents: [] };
    const result = subcollections.structure.apply(slots, context);
    expect(result).toBe(slots);
  });

  it("does not mutate input slots", () => {
    const slots = Object.freeze({ sections: Object.freeze([]) });
    const context = { ontology, mainEntity: "Portfolio", intents };
    expect(() => subcollections.structure.apply(slots, context)).not.toThrow();
  });

  it("sets layout:m2m for assignment entities", () => {
    const ontM2m = {
      entities: {
        Portfolio: { fields: { name: { type: "text" } } },
        Assignment: { kind: "assignment", fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, userId: { type: "foreignKey", refs: "User" } } },
      },
    };
    const slots = {};
    const result = subcollections.structure.apply(slots, { ontology: ontM2m, mainEntity: "Portfolio", intents: [] });
    const assignments = result.sections.find(s => s.id === "assignments");
    expect(assignments.layout).toBe("m2m");
  });

  it("author curation — projection.subCollections задан → apply no-op", () => {
    const slots = { sections: [] };
    const projection = {
      mainEntity: "Portfolio",
      subCollections: [{ entity: "Position" }],
    };
    const result = subcollections.structure.apply(slots, {
      ontology,
      mainEntity: "Portfolio",
      intents,
      projection,
    });
    // apply не должен добавить Transaction — автор зафиксировал curated список.
    expect(result).toBe(slots);
  });

  it("empty projection.subCollections — НЕ считается curated (apply отрабатывает)", () => {
    const slots = {};
    const projection = { mainEntity: "Portfolio", subCollections: [] };
    const result = subcollections.structure.apply(slots, {
      ontology,
      mainEntity: "Portfolio",
      intents,
      projection,
    });
    expect(result.sections).toHaveLength(2);
  });

  it("section имеет title + itemEntity + itemView (render-ready shape, G14)", () => {
    // До fix'а auto-derived section имел только {id, entity, foreignKey,
    // layout, intents, source} — renderer читает slots.sections[].{title,
    // itemEntity, itemView} и получал undefined → визуальный регресс на
    // Gravitino (user_detail / role_detail / group_detail с пустыми
    // заголовками). docs/gravitino-gaps.md G14.
    const slots = {};
    const result = subcollections.structure.apply(slots, {
      ontology, mainEntity: "Portfolio", intents,
    });
    const positions = result.sections.find(s => s.id === "positions");
    expect(positions.title).toBe("Position");
    expect(positions.itemEntity).toBe("Position");
    // Fallback itemView на 'id' (fixture Position не имеет primary-title
    // или name/title/label поля, только ticker). Test ниже проверяет
    // правильный path через name-fallback.
    expect(positions.itemView.type).toBe("text");
    expect(positions.itemIntents).toEqual(["add_position"]);
    // Backward compat — legacy 'entity' / 'intents' также оставлены.
    expect(positions.entity).toBe("Position");
    expect(positions.intents).toEqual(["add_position"]);
  });

  it("itemView fallback на id если нет primary-title", () => {
    const ontNoTitle = {
      entities: {
        Parent: { fields: { id: { type: "text", readOnly: true } } },
        Child: { fields: { parentId: { type: "foreignKey", refs: "Parent" }, ts: { type: "datetime" } } },
      },
    };
    const slots = {};
    const result = subcollections.structure.apply(slots, {
      ontology: ontNoTitle, mainEntity: "Parent", intents: [],
    });
    const child = result.sections.find(s => s.itemEntity === "Child");
    expect(child.itemView.bind).toBe("id");
  });

  it("humanize multi-word entity name (OrderItem → 'Order item')", () => {
    const ontMw = {
      entities: {
        Order: { fields: { id: { type: "text" } } },
        OrderItem: { fields: { orderId: { type: "foreignKey", refs: "Order" }, label: { type: "text" } } },
      },
    };
    const slots = {};
    const result = subcollections.structure.apply(slots, {
      ontology: ontMw, mainEntity: "Order", intents: [],
    });
    const oi = result.sections[0];
    expect(oi.title).toBe("Order item");
  });

  // §13d (Notion field-test 2026-04-27)
  describe("§13d — author signals", () => {
    const onto = {
      entities: {
        Page:       { fields: { id: { type: "text" } } },
        Block:      { fields: { id: { type: "text" }, pageId: { type: "foreignKey", refs: "Page" }, text: { type: "text" } } },
        Comment:    { fields: { id: { type: "text" }, pageId: { type: "foreignKey", refs: "Page" } } },
        Permission: { fields: { id: { type: "text" }, pageId: { type: "foreignKey", refs: "Page" } } },
      },
    };

    it("nested slots.subCollections (author-curated) — pattern no-op", () => {
      const projection = {
        slots: {
          subCollections: [
            { projectionId: "comments_thread", foreignKey: "pageId", entity: "Comment" },
          ],
        },
      };
      const result = subcollections.structure.apply({}, {
        ontology: onto, mainEntity: "Page", intents: [], projection,
      });
      expect(result).toEqual({}); // no auto-derive
    });

    it("absorbExclude: ['Block'] — Block НЕ попадает в auto-derived sections", () => {
      const projection = { absorbExclude: ["Block"] };
      const result = subcollections.structure.apply({}, {
        ontology: onto, mainEntity: "Page", intents: [], projection,
      });
      expect(result.sections.map(s => s.itemEntity).sort()).toEqual(["Comment", "Permission"]);
    });

    it("absorbExclude: ['Block','Comment'] — только Permission остаётся", () => {
      const projection = { absorbExclude: ["Block", "Comment"] };
      const result = subcollections.structure.apply({}, {
        ontology: onto, mainEntity: "Page", intents: [], projection,
      });
      expect(result.sections.map(s => s.itemEntity)).toEqual(["Permission"]);
    });

    it("absorbExclude: [] — все 3 child entities добавлены (baseline)", () => {
      const projection = { absorbExclude: [] };
      const result = subcollections.structure.apply({}, {
        ontology: onto, mainEntity: "Page", intents: [], projection,
      });
      expect(result.sections).toHaveLength(3);
    });

    it("non-array absorbExclude — silently игнорируется (baseline)", () => {
      const projection = { absorbExclude: "Block" }; // string
      const result = subcollections.structure.apply({}, {
        ontology: onto, mainEntity: "Page", intents: [], projection,
      });
      expect(result.sections).toHaveLength(3);
    });
  });
});
