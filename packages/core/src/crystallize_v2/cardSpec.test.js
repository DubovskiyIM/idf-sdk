import { describe, it, expect } from "vitest";
import { buildCardSpec } from "./cardSpec.js";

describe("buildCardSpec", () => {
  it("empty / missing witnesses → {}", () => {
    expect(buildCardSpec([], "Listing", { entities: {} })).toEqual({});
    expect(buildCardSpec(undefined, "Listing", { entities: {} })).toEqual({});
    expect(buildCardSpec(null, "Listing", { entities: {} })).toEqual({});
  });

  it("собирает image / title / price по ролям", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            photos: { type: "multiImage" },
            title: { type: "text" },
            price: { type: "number" },
          },
        },
      },
    };
    const spec = buildCardSpec(["photos", "title", "price"], "Listing", ontology);
    expect(spec.image).toEqual({ bind: "photos" });
    expect(spec.title).toEqual({ bind: "title" });
    expect(spec.price).toEqual({ bind: "price", format: "currency", suffix: " ₽" });
    expect(spec.metrics).toBeUndefined();
  });

  it("собирает ≥3 metric-полей в cardSpec.metrics", () => {
    const ontology = {
      entities: {
        Portfolio: {
          fields: {
            totalValue: { type: "number", label: "Стоимость" },
            pnl: { type: "number", label: "Прибыль" },
            dailyChange: { type: "number" },
          },
        },
      },
    };
    const spec = buildCardSpec(["totalValue", "pnl", "dailyChange"], "Portfolio", ontology);
    expect(Array.isArray(spec.metrics)).toBe(true);
    expect(spec.metrics).toHaveLength(3);
    expect(spec.metrics[0]).toEqual({ bind: "totalValue", label: "Стоимость" });
    expect(spec.metrics[1]).toEqual({ bind: "pnl", label: "Прибыль" });
    expect(spec.metrics[2]).toEqual({ bind: "dailyChange", label: "dailyChange" });
  });

  it("computed witness {field, compute} → metric", () => {
    const spec = buildCardSpec(
      [{ field: "avgRating", compute: "avg(reviews.score)" }],
      "Listing",
      { entities: { Listing: { fields: {} } } }
    );
    expect(spec.metrics).toEqual([
      { bind: "avgRating", compute: "avg(reviews.score)" },
    ]);
  });

  it("badge / timer / location собираются корректно", () => {
    const ontology = {
      entities: {
        Auction: {
          fields: {
            status: { type: "enum" },
            endAt: { type: "datetime" },
            city: { type: "text" },
          },
        },
      },
    };
    const spec = buildCardSpec(["status", "endAt", "city"], "Auction", ontology);
    expect(spec.badge).toEqual({ bind: "status" });
    expect(spec.timer).toEqual({ bind: "endAt", format: "countdown" });
    expect(spec.location).toEqual({ bind: "city" });
  });

  it("первое совпадение побеждает для single-слота ролей", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            title: { type: "text" },
            name: { type: "text" },
          },
        },
      },
    };
    // title и name оба резолвятся в role:title — побеждает первый
    const spec = buildCardSpec(["title", "name"], "Listing", ontology);
    expect(spec.title).toEqual({ bind: "title" });
  });
});
