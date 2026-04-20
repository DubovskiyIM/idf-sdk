import { describe, it, expect } from "vitest";
import pattern from "./review-criterion-breakdown.js";

const ONTOLOGY_WITH_CRITERIA = {
  entities: {
    Specialist: {
      kind: "internal",
      fields: { id: { type: "id" }, name: { type: "text" } },
    },
    Review: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        specialistId: { type: "entityRef", entity: "Specialist" },
        quality: { type: "number", label: "Качество" },
        punctuality: { type: "number", label: "Пунктуальность" },
        politeness: { type: "number", label: "Вежливость" },
        comment: { type: "text" },
      },
    },
  },
};

const ONTOLOGY_RATING_SUFFIX = {
  entities: {
    Merchant: {
      kind: "internal",
      fields: { id: { type: "id" }, name: { type: "text" } },
    },
    Review: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        merchantId: { type: "entityRef", entity: "Merchant" },
        food_rating: { type: "number" },
        packaging_rating: { type: "number" },
        speed_rating: { type: "number" },
      },
    },
  },
};

const ONTOLOGY_OVERALL_ONLY = {
  entities: {
    Listing: {
      kind: "internal",
      fields: { id: { type: "id" } },
    },
    Review: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        listingId: { type: "entityRef", entity: "Listing" },
        rating: { type: "number" },  // только overall, без breakdown
        comment: { type: "text" },
      },
    },
  },
};

describe("review-criterion-breakdown — trigger match()", () => {
  it("match=true для named criteria полей (quality/punctuality/politeness)", () => {
    const r = pattern.trigger.match([], ONTOLOGY_WITH_CRITERIA, {
      kind: "detail", mainEntity: "Specialist",
    });
    expect(r).toBe(true);
  });

  it("match=true для *_rating suffix полей", () => {
    const r = pattern.trigger.match([], ONTOLOGY_RATING_SUFFIX, {
      kind: "detail", mainEntity: "Merchant",
    });
    expect(r).toBe(true);
  });

  it("match=false когда sub-entity имеет <3 criterion-полей", () => {
    const r = pattern.trigger.match([], ONTOLOGY_OVERALL_ONLY, {
      kind: "detail", mainEntity: "Listing",
    });
    expect(r).toBe(false);
  });

  it("match=false для non-detail проекции", () => {
    const r = pattern.trigger.match([], ONTOLOGY_WITH_CRITERIA, {
      kind: "catalog", mainEntity: "Specialist",
    });
    expect(r).toBe(false);
  });
});

describe("review-criterion-breakdown — structure.apply", () => {
  const context = {
    ontology: ONTOLOGY_WITH_CRITERIA,
    projection: { kind: "detail", mainEntity: "Specialist" },
  };

  it("prepend'ит criterionSummary section в sections", () => {
    const out = pattern.structure.apply({}, context);
    expect(Array.isArray(out.sections)).toBe(true);
    expect(out.sections[0]).toMatchObject({
      type: "criterionSummary",
      source: "derived:review-criterion-breakdown",
      subEntity: "Review",
      fkField: "specialistId",
      title: "Оценка по критериям",
    });
    expect(out.sections[0].criteria.length).toBe(3);
    const fields = out.sections[0].criteria.map(c => c.field);
    expect(fields).toEqual(["quality", "punctuality", "politeness"]);
  });

  it("сохраняет existing sections", () => {
    const existing = { sections: [{ id: "reviews", type: "list" }] };
    const out = pattern.structure.apply(existing, context);
    expect(out.sections.length).toBe(2);
    expect(out.sections[0].type).toBe("criterionSummary");
    expect(out.sections[1].type).toBe("list");
  });

  it("author-override: existing criterionSummary section → no-op", () => {
    const existing = { sections: [{ type: "criterionSummary", id: "custom" }] };
    const out = pattern.structure.apply(existing, context);
    expect(out).toBe(existing);
  });

  it("criterion labels берёт из fieldDef.label", () => {
    const out = pattern.structure.apply({}, context);
    const criteria = out.sections[0].criteria;
    expect(criteria.find(c => c.field === "quality").label).toBe("Качество");
    expect(criteria.find(c => c.field === "punctuality").label).toBe("Пунктуальность");
  });

  it("humanize *_rating имён для label fallback", () => {
    const out = pattern.structure.apply({}, {
      ontology: ONTOLOGY_RATING_SUFFIX,
      projection: { kind: "detail", mainEntity: "Merchant" },
    });
    const labels = out.sections[0].criteria.map(c => c.label);
    expect(labels).toContain("Food");
    expect(labels).toContain("Packaging");
    expect(labels).toContain("Speed");
  });

  it("чистая функция: не мутирует входной slots", () => {
    const input = { sections: [{ id: "x", type: "list" }] };
    const snapshot = JSON.stringify(input);
    pattern.structure.apply(input, context);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
