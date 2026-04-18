/**
 * Функториальность кристаллизации (§16).
 *
 * Заявление IDF «формат, а не фреймворк» опирается на то, что
 * crystallizeV2 — функция от семантики, не от порядка авторства:
 *   ∀ permutation π над ключами INTENTS/PROJECTIONS →
 *     crystallize(π(INTENTS), π(PROJECTIONS), O) ≡ crystallize(INTENTS, PROJECTIONS, O)
 *
 * Probe функториальности на 9 реальных доменах живёт в
 * idf/scripts/functoriality-probe.mjs. Здесь — unit-регрессия
 * на минимальном примере.
 */
import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

const ONTOLOGY = {
  entities: {
    Listing: {
      fields: {
        id: { type: "id", writable: false, readable: true },
        title: { type: "string", writable: true, readable: true },
        price: { type: "number", writable: true, readable: true },
      },
      roles: {},
    },
  },
};

const PROJECTIONS = {
  listing_catalog: {
    name: "Лоты",
    kind: "catalog",
    mainEntity: "Listing",
    query: "список лотов",
  },
};

// Порядок ключей специально расставлен «обратным» — zzz_, mmm_, aaa_
// чтобы Object.entries порядок заметно отличался от сортированного.
const INTENTS_A = {
  zzz_remove_listing: {
    name: "Удалить", particles: {
      entities: ["listing: Listing"], conditions: [],
      effects: [{ α: "remove", target: "listings", σ: "account" }],
      witnesses: ["listing.title"], confirmation: "click",
    }, antagonist: null, creates: null,
  },
  aaa_create_listing: {
    name: "Создать", particles: {
      entities: ["listing: Listing"], conditions: [],
      effects: [{ α: "add", target: "listings", σ: "account" }],
      witnesses: [], confirmation: "click",
    }, antagonist: null, creates: "Listing",
  },
  mmm_edit_listing: {
    name: "Редактировать", particles: {
      entities: ["listing: Listing"], conditions: [],
      effects: [{ α: "replace", target: "listing.title", σ: "account" }],
      witnesses: ["listing.title"], confirmation: "click",
    }, antagonist: null, creates: null,
  },
};

// Тот же набор, другой порядок ключей.
const INTENTS_B = {
  aaa_create_listing: INTENTS_A.aaa_create_listing,
  mmm_edit_listing: INTENTS_A.mmm_edit_listing,
  zzz_remove_listing: INTENTS_A.zzz_remove_listing,
};

function stripVolatile(artifacts) {
  const out = {};
  for (const [k, v] of Object.entries(artifacts)) {
    if (!v) { out[k] = v; continue; }
    const { generatedAt, ...rest } = v;
    out[k] = rest;
  }
  return out;
}

describe("crystallizeV2 — функториальность под permutation INTENTS", () => {
  it("два порядка ключей INTENTS дают идентичные артефакты (strict)", () => {
    const a = stripVolatile(crystallizeV2(INTENTS_A, PROJECTIONS, ONTOLOGY, "test"));
    const b = stripVolatile(crystallizeV2(INTENTS_B, PROJECTIONS, ONTOLOGY, "test"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("порядок ключей PROJECTIONS не влияет на артефакты", () => {
    const P1 = {
      catalog_x: { name: "X", kind: "catalog", mainEntity: "Listing", query: "q" },
      catalog_a: { name: "A", kind: "catalog", mainEntity: "Listing", query: "q" },
    };
    const P2 = { catalog_a: P1.catalog_a, catalog_x: P1.catalog_x };
    const a = stripVolatile(crystallizeV2(INTENTS_A, P1, ONTOLOGY, "test"));
    const b = stripVolatile(crystallizeV2(INTENTS_A, P2, ONTOLOGY, "test"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("артефакт детерминирован при повторных вызовах с теми же входами", () => {
    const a = stripVolatile(crystallizeV2(INTENTS_A, PROJECTIONS, ONTOLOGY, "test"));
    const b = stripVolatile(crystallizeV2(INTENTS_A, PROJECTIONS, ONTOLOGY, "test"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
