import { describe, it, expect } from "vitest";
import pattern from "./rating-aggregate-hero.js";

const ONTOLOGY_WITH_REVIEW = {
  entities: {
    Specialist: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        name: { type: "text" },
      },
    },
    Review: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        specialistId: { type: "entityRef", entity: "Specialist" },
        rating: { type: "number" },
        comment: { type: "text" },
      },
    },
  },
};

const ONTOLOGY_NO_RATING = {
  entities: {
    Message: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        text: { type: "text" },
      },
    },
    Reaction: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        messageId: { type: "entityRef", entity: "Message" },
        emoji: { type: "text" },
      },
    },
  },
};

describe("rating-aggregate-hero — trigger match()", () => {
  it("match=true для detail Specialist + Review.rating", () => {
    const result = pattern.trigger.match(
      [],
      ONTOLOGY_WITH_REVIEW,
      { kind: "detail", mainEntity: "Specialist" }
    );
    expect(result).toBe(true);
  });

  it("match=false для non-detail проекции (catalog)", () => {
    const result = pattern.trigger.match(
      [],
      ONTOLOGY_WITH_REVIEW,
      { kind: "catalog", mainEntity: "Specialist" }
    );
    expect(result).toBe(false);
  });

  it("match=false когда sub-entity без rating-поля", () => {
    const result = pattern.trigger.match(
      [],
      ONTOLOGY_NO_RATING,
      { kind: "detail", mainEntity: "Message" }
    );
    expect(result).toBe(false);
  });

  it("match=false когда sub-entity отсутствует вообще", () => {
    const ontology = {
      entities: {
        Solo: { kind: "internal", fields: { id: { type: "id" } } },
      },
    };
    const result = pattern.trigger.match([], ontology, { kind: "detail", mainEntity: "Solo" });
    expect(result).toBe(false);
  });
});

describe("rating-aggregate-hero — structure.apply", () => {
  const context = {
    ontology: ONTOLOGY_WITH_REVIEW,
    projection: { kind: "detail", mainEntity: "Specialist" },
  };

  it("добавляет ratingAggregate spec в slots.header", () => {
    const out = pattern.structure.apply({}, context);
    expect(Array.isArray(out.header)).toBe(true);
    expect(out.header[0]).toMatchObject({
      type: "ratingAggregate",
      source: "derived:rating-aggregate-hero",
      subEntity: "Review",
      fkField: "specialistId",
      ratingField: "rating",
      countLabel: "отзывов",
    });
  });

  it("prepend'ит к существующему header, сохраняя items", () => {
    const existing = { header: [{ type: "heading", content: "Заголовок" }] };
    const out = pattern.structure.apply(existing, context);
    expect(out.header.length).toBe(2);
    expect(out.header[0].type).toBe("ratingAggregate");
    expect(out.header[1].type).toBe("heading");
  });

  it("author-override: не дублирует если ratingAggregate уже в header", () => {
    const existing = { header: [{ type: "ratingAggregate", subEntity: "Custom" }] };
    const out = pattern.structure.apply(existing, context);
    expect(out).toBe(existing);
  });

  it("no-op для projection без sub-entity с rating", () => {
    const out = pattern.structure.apply({}, {
      ontology: ONTOLOGY_NO_RATING,
      projection: { kind: "detail", mainEntity: "Message" },
    });
    expect(out).toEqual({});
  });

  it("чистая функция: не мутирует входной slots", () => {
    const input = { header: [{ type: "heading" }] };
    const snapshot = JSON.stringify(input);
    pattern.structure.apply(input, context);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("rating-aggregate-hero — field-role explicit + name-hint", () => {
  it("detect'ит поле с fieldRole:'rating' без name-hint", () => {
    const ontology = {
      entities: {
        Host: { kind: "internal", fields: { id: { type: "id" } } },
        Feedback: {
          kind: "internal",
          fields: {
            id: { type: "id" },
            hostId: { type: "entityRef", entity: "Host" },
            score: { type: "number", fieldRole: "rating" },
          },
        },
      },
    };
    const result = pattern.trigger.match([], ontology, { kind: "detail", mainEntity: "Host" });
    expect(result).toBe(true);
    const out = pattern.structure.apply({}, { ontology, projection: { kind: "detail", mainEntity: "Host" } });
    expect(out.header[0].ratingField).toBe("score");
  });
});
