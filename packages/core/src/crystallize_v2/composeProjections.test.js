import { describe, it, expect } from "vitest";
import { composeProjections } from "./composeProjections.js";

describe("composeProjections — layered authoring", () => {
  const INTENTS = {
    add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
    publish_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
  };
  const ONTOLOGY = {
    entities: {
      Listing: {
        ownerField: "sellerId",
        fields: { sellerId: { type: "entityRef" }, title: { type: "text" }, status: { type: "text" } },
      },
    },
  };

  it("Layer 0: без overrides и extra — возвращает derived как есть", () => {
    const result = composeProjections(INTENTS, ONTOLOGY);
    expect(result.listing_list).toBeDefined();
    expect(result.listing_detail).toBeDefined();
    expect(result.my_listing_list).toBeDefined();
    expect(result.listing_list.derivedBy).toBeDefined();
  });

  it("Layer 1: override без rename — merge поверх derived, сохраняя derivedBy", () => {
    const OVERRIDES = {
      listing_detail: {
        name: "Лот",
        query: "детали одного лота",
        idParam: "listingId",
      },
    };
    const result = composeProjections(INTENTS, ONTOLOGY, OVERRIDES);
    expect(result.listing_detail.name).toBe("Лот");
    expect(result.listing_detail.idParam).toBe("listingId");
    expect(result.listing_detail.kind).toBe("detail");  // из derived
    expect(result.listing_detail.derivedBy).toBeDefined();
    const r3 = result.listing_detail.derivedBy.find(w => w.ruleId === "R3");
    expect(r3).toBeDefined();
  });

  it("Layer 1: override с `as` — rename derived id и merge overrides", () => {
    const OVERRIDES = {
      my_listing_list: {
        as: "my_listings",
        name: "Мои лоты",
      },
    };
    const result = composeProjections(INTENTS, ONTOLOGY, OVERRIDES);
    expect(result.my_listings).toBeDefined();
    expect(result.my_listings.name).toBe("Мои лоты");
    expect(result.my_listings.filter).toEqual({ field: "sellerId", op: "=", value: "me.id" });  // из derived
    expect(result.my_listing_list).toBeUndefined();  // renamed away
    // witness R7 переносится с проекцией
    const r7 = result.my_listings.derivedBy.find(w => w.ruleId === "R7");
    expect(r7).toBeDefined();
  });

  it("Layer 2: EXTRA добавляет проекции без derivation origin (dashboard, form)", () => {
    const EXTRA = {
      sales_home: { kind: "dashboard", widgets: [{ title: "Главное" }] },
    };
    const result = composeProjections(INTENTS, ONTOLOGY, {}, EXTRA);
    expect(result.sales_home).toEqual({ kind: "dashboard", widgets: [{ title: "Главное" }] });
    expect(result.sales_home.derivedBy).toBeUndefined();  // authored, не derived
  });

  it("коллизия rename: два override'а на один target id — throw", () => {
    const OVERRIDES = {
      listing_list: { as: "the_list" },
      my_listing_list: { as: "the_list" },  // коллизия
    };
    expect(() => composeProjections(INTENTS, ONTOLOGY, OVERRIDES)).toThrow(/collision/);
  });

  it("коллизия extra: EXTRA id совпадает с derived — throw", () => {
    const EXTRA = { listing_detail: { kind: "canvas" } };
    expect(() => composeProjections(INTENTS, ONTOLOGY, {}, EXTRA)).toThrow(/collides/);
  });
});
