import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";
import { assignToSlotsDetail } from "./assignToSlotsDetail.js";

/**
 * Tier-driven slot routing — opt-in через ontology.features.salienceDrivenRouting.
 *
 * Закрывает A2 author-audit structural divergence: до этого assignToSlots*
 * не консультировало classifyIntentRole для slot routing'а; salience влияла
 * только на in-slot ordering. Теперь explicit primary tier (salience >= 80)
 * промотируется в hero/primaryCTA.
 */

const baseOntology = (extra = {}) => ({
  entities: {
    Listing: {
      ownerField: "ownerId",
      fields: {
        id: { type: "string" },
        title: { type: "string" },
        ownerId: { type: "string" },
      },
    },
  },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing", "publish_listing"] },
  },
  ...extra,
});

const intentCreate = (id, salience = undefined) => ({
  name: `Создать ${id}`,
  particles: {
    entities: ["listing: Listing"],
    effects: [{ α: "add", target: "listings" }],
    witnesses: ["title"],
    confirmation: "click",
  },
  creates: "Listing",
  ...(salience !== undefined ? { salience } : {}),
});

const intentEdit = (id, salience = undefined) => ({
  name: `Edit ${id}`,
  particles: {
    entities: ["listing: Listing"],
    conditions: ["listing.ownerId = me.id"],
    effects: [{ α: "replace", target: "listing.title" }],
    witnesses: [],
    confirmation: "click",
  },
  ...(salience !== undefined ? { salience } : {}),
});

describe("Tier-driven catalog routing (salienceDrivenRouting default-on)", () => {
  it("default (без features): explicit primary creator промотируется в hero", () => {
    // Default-flip (#439): salienceDrivenRouting теперь !== false by default.
    const INTENTS = { create_listing: intentCreate("listing", 90) };
    const ONTOLOGY = baseOntology();
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    const heroIds = slots.hero.map((n) => n.intentId);
    expect(heroIds).toContain("create_listing");
    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).not.toContain("create_listing");
  });

  it("explicit opt-out (false): explicit primary creator уходит в toolbar (legacy)", () => {
    const INTENTS = { create_listing: intentCreate("listing", 90) };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: false } });
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    expect(slots.hero).toEqual([]);
    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).toContain("create_listing");
  });

  it("explicit opt-in (true): explicit primary creator промотируется в hero", () => {
    const INTENTS = { create_listing: intentCreate("listing", 90) };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: true } });
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    const heroIds = slots.hero.map((n) => n.intentId);
    expect(heroIds).toContain("create_listing");
  });

  it("default: creator-of-main без explicit salience авто-промотируется (#438 + default-flip)", () => {
    // classifyIntentRole возвращает "primary" для creator-of-main даже без
    // explicit intent.salience. После #438 + default-flip — auto без host
    // annotation и без features flag.
    const INTENTS = { create_listing: intentCreate("listing") };
    const ONTOLOGY = baseOntology(); // нет features
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    const heroIds = slots.hero.map((n) => n.intentId);
    expect(heroIds).toContain("create_listing");
    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).not.toContain("create_listing");
  });

  it("explicit opt-out (false): creator-of-main без salience уходит в toolbar (legacy escape hatch)", () => {
    const INTENTS = { create_listing: intentCreate("listing") };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: false } });
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    expect(slots.hero).toEqual([]);
    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).toContain("create_listing");
  });

  it("с feature flag: salience < 80 не промотируется (только primary tier)", () => {
    const INTENTS = { create_listing: intentCreate("listing", 70) };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: true } });
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    expect(slots.hero).toEqual([]);
  });

  it("с feature flag: hero уже занят (authored hero) — fallback в toolbar", () => {
    const INTENTS = { create_listing: intentCreate("listing", 90) };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: true } });
    const PROJECTION = {
      id: "listing_catalog",
      mainEntity: "Listing",
      archetype: "catalog",
      hero: { type: "card", title: "Promo banner" },
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "default", {
      role: "seller",
    });

    // Hero содержит authored banner, но НЕ create_listing.
    expect(slots.hero.find((n) => n.type === "card")).toBeDefined();
    expect(slots.hero.find((n) => n.intentId === "create_listing")).toBeUndefined();

    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).toContain("create_listing");
  });

  it("с feature flag: shape=timeline блокирует hero promotion (как для heroCreate)", () => {
    const INTENTS = { create_listing: intentCreate("listing", 90) };
    const ONTOLOGY = baseOntology({ features: { salienceDrivenRouting: true } });
    const PROJECTION = {
      id: "listing_timeline",
      mainEntity: "Listing",
      archetype: "catalog",
    };

    const slots = assignToSlotsCatalog(INTENTS, PROJECTION, ONTOLOGY, null, "timeline", {
      role: "seller",
    });

    expect(slots.hero).toEqual([]);
    const toolbarIds = slots.toolbar
      .filter((n) => n.intentId)
      .map((n) => n.intentId);
    expect(toolbarIds).toContain("create_listing");
  });
});

describe("Tier-driven detail routing (salienceDrivenRouting feature)", () => {
  const detailOntology = (extra = {}) => ({
    entities: {
      Listing: {
        ownerField: "ownerId",
        fields: {
          id: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
          ownerId: { type: "string" },
        },
      },
    },
    roles: {
      seller: { canExecute: ["edit_listing", "promote_listing", "publish_listing"] },
    },
    ...extra,
  });

  const PROJECTION = {
    id: "listing_detail",
    mainEntity: "Listing",
    archetype: "detail",
  };

  it("explicit opt-out (false): explicit primary edit-intent остаётся в toolbar (legacy escape)", () => {
    // Default-flip (#439): default теперь !== false, opt-out через explicit false.
    const INTENTS = {
      promote_listing: {
        name: "Продвинуть",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id"],
          effects: [{ α: "replace", target: "listing.featured", value: true }],
          witnesses: [],
          confirmation: "click",
        },
        salience: 90,
      },
    };
    const ONTOLOGY = detailOntology({ features: { salienceDrivenRouting: false } });

    const slots = assignToSlotsDetail(INTENTS, PROJECTION, ONTOLOGY, null, {
      role: "seller",
    });

    expect(slots.primaryCTA).toEqual([]);
    expect(slots.toolbar.find((n) => n.intentId === "promote_listing")).toBeDefined();
  });

  it("default: explicit primary edit-intent промотируется в primaryCTA (post-flip)", () => {
    const INTENTS = {
      promote_listing: {
        name: "Продвинуть",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id"],
          effects: [{ α: "replace", target: "listing.featured", value: true }],
          witnesses: [],
          confirmation: "click",
        },
        salience: 90,
      },
    };
    const ONTOLOGY = detailOntology(); // нет features

    const slots = assignToSlotsDetail(INTENTS, PROJECTION, ONTOLOGY, null, {
      role: "seller",
    });

    const primaryIds = slots.primaryCTA.map((n) => n.intentId);
    expect(primaryIds).toContain("promote_listing");
    expect(slots.toolbar.find((n) => n.intentId === "promote_listing")).toBeUndefined();
  });

  it("с feature flag: explicit primary без params промотируется в primaryCTA", () => {
    const INTENTS = {
      promote_listing: {
        name: "Продвинуть",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id"],
          effects: [{ α: "replace", target: "listing.featured", value: true }],
          witnesses: [],
          confirmation: "click",
        },
        salience: 90,
      },
    };
    const ONTOLOGY = detailOntology({ features: { salienceDrivenRouting: true } });

    const slots = assignToSlotsDetail(INTENTS, PROJECTION, ONTOLOGY, null, {
      role: "seller",
    });

    const primaryIds = slots.primaryCTA.map((n) => n.intentId);
    expect(primaryIds).toContain("promote_listing");
    expect(slots.toolbar.find((n) => n.intentId === "promote_listing")).toBeUndefined();
  });

  it("с feature flag: irreversibility: high — НЕ промотируется (защита)", () => {
    const INTENTS = {
      delete_listing: {
        name: "Удалить",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id"],
          effects: [{ α: "remove", target: "listing" }],
          witnesses: [],
          confirmation: "click",
        },
        salience: 90,
        irreversibility: "high",
      },
    };
    const ONTOLOGY = detailOntology({ features: { salienceDrivenRouting: true } });

    const slots = assignToSlotsDetail(INTENTS, PROJECTION, ONTOLOGY, null, {
      role: "seller",
    });

    expect(slots.primaryCTA).toEqual([]);
  });

  it("с feature flag: phase-transition (legacy primaryCTA) сохраняется", () => {
    const INTENTS = {
      publish_listing: {
        name: "Опубликовать",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id", "listing.status = 'draft'"],
          effects: [{ α: "replace", target: "listing.status", value: "published" }],
          witnesses: [],
          confirmation: "click",
        },
      },
    };
    const ONTOLOGY = detailOntology({ features: { salienceDrivenRouting: true } });

    const slots = assignToSlotsDetail(INTENTS, PROJECTION, ONTOLOGY, null, {
      role: "seller",
    });

    const primaryIds = slots.primaryCTA.map((n) => n.intentId);
    expect(primaryIds).toContain("publish_listing");
  });

  it("с feature flag: toolbarWhitelist override побеждает tier promotion", () => {
    const INTENTS = {
      promote_listing: {
        name: "Продвинуть",
        particles: {
          entities: ["listing: Listing"],
          conditions: ["listing.ownerId = me.id"],
          effects: [{ α: "replace", target: "listing.featured", value: true }],
          witnesses: [],
          confirmation: "click",
        },
        salience: 90,
      },
    };
    const ONTOLOGY = detailOntology({ features: { salienceDrivenRouting: true } });
    const projWithWhitelist = {
      ...PROJECTION,
      toolbar: ["promote_listing"],
    };

    const slots = assignToSlotsDetail(INTENTS, projWithWhitelist, ONTOLOGY, null, {
      role: "seller",
    });

    expect(slots.primaryCTA).toEqual([]);
    expect(slots.toolbar.find((n) => n.intentId === "promote_listing")).toBeDefined();
  });
});
