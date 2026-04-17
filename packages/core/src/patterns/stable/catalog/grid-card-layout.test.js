import { describe, it, expect } from "vitest";
import gridCardLayout from "./grid-card-layout.js";

const ontology = {
  entities: {
    Portfolio: {
      fields: {
        name: { type: "text" },
        totalValue: { type: "number", label: "Стоимость" },
        pnl: { type: "number", label: "Прибыль" },
        riskProfile: { type: "enum" },
      },
    },
    Listing: {
      fields: {
        photos: { type: "multiImage" },
        title: { type: "text" },
        price: { type: "number" },
      },
    },
  },
};

describe("grid-card-layout.structure.apply", () => {
  it("выставляет body.layout = 'grid' когда отсутствует", () => {
    const slots = { body: { type: "list", source: "portfolios" } };
    const projection = {
      mainEntity: "Portfolio",
      witnesses: ["name", "totalValue", "pnl", "riskProfile"],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result.body.layout).toBe("grid");
    expect(result.body.type).toBe("list");
    expect(result.body.source).toBe("portfolios");
  });

  it("idempotent когда body.layout === 'grid' — возвращает те же slots", () => {
    const slots = { body: { type: "list", layout: "grid", cardSpec: { title: { bind: "custom" } } } };
    const projection = {
      mainEntity: "Portfolio",
      witnesses: ["name", "totalValue"],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result).toBe(slots);
    expect(result.body.cardSpec.title.bind).toBe("custom");
  });

  it("обогащает cardSpec на основе witnesses + ontology", () => {
    const slots = { body: { type: "list", source: "listings" } };
    const projection = {
      mainEntity: "Listing",
      witnesses: ["photos", "title", "price"],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result.body.layout).toBe("grid");
    expect(result.body.cardSpec).toBeDefined();
    expect(result.body.cardSpec.image).toEqual({ bind: "photos" });
    expect(result.body.cardSpec.title).toEqual({ bind: "title" });
    expect(result.body.cardSpec.price).toEqual({ bind: "price", format: "currency", suffix: " ₽" });
  });

  it("не мутирует входной slots и body", () => {
    const originalBody = { type: "list", source: "portfolios" };
    const slots = { body: originalBody, other: "preserved" };
    Object.freeze(slots);
    Object.freeze(originalBody);
    const projection = {
      mainEntity: "Portfolio",
      witnesses: ["name", "totalValue"],
    };
    expect(() =>
      gridCardLayout.structure.apply(slots, { projection, ontology })
    ).not.toThrow();
    expect(originalBody.layout).toBeUndefined();
    expect(slots.body).toBe(originalBody);
  });

  it("сохраняет остальные поля body и другие слоты", () => {
    const slots = {
      body: { type: "list", source: "portfolios", gap: 8, filter: "x > 0", item: { type: "card" } },
      toolbar: [{ type: "intentButton", intentId: "x" }],
      header: [],
    };
    const projection = {
      mainEntity: "Portfolio",
      witnesses: ["name"],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result.body.type).toBe("list");
    expect(result.body.source).toBe("portfolios");
    expect(result.body.gap).toBe(8);
    expect(result.body.filter).toBe("x > 0");
    expect(result.body.item).toEqual({ type: "card" });
    expect(result.toolbar).toBe(slots.toolbar);
    expect(result.header).toBe(slots.header);
  });

  it("добавляет только layout:'grid' когда cardSpec пустой (нет matching witnesses)", () => {
    const slots = { body: { type: "list" } };
    const projection = {
      mainEntity: "Unknown",
      witnesses: [],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result.body.layout).toBe("grid");
    expect(result.body.cardSpec).toBeUndefined();
  });

  it("работает когда slots.body отсутствует", () => {
    const slots = { header: [] };
    const projection = {
      mainEntity: "Portfolio",
      witnesses: ["name"],
    };
    const result = gridCardLayout.structure.apply(slots, { projection, ontology });
    expect(result.body).toBeDefined();
    expect(result.body.layout).toBe("grid");
  });
});
