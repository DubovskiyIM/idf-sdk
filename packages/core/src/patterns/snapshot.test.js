// snapshot.test.js
//
// Regression snapshot: для каждой проекции из реальных доменов idf/, где
// author'ом декларирован subCollections (explicit override), проверяем что
// subcollections.structure.apply ЛИБО воспроизводит тот же набор section.id
// (когда subCollections отсутствуют в projection — derived-path), ЛИБО
// остаётся no-op и сохраняет authored sections (когда subCollections явно
// заданы — author-curation-path, §16).
//
// Фикстуры копируются локально в __fixtures__/ (no cross-repo imports).

import { describe, it, expect } from "vitest";
import { explainMatch } from "./index.js";

import * as investFx from "./__fixtures__/invest.js";
import * as planningFx from "./__fixtures__/planning.js";
import * as deliveryFx from "./__fixtures__/delivery.js";
import * as lifequestFx from "./__fixtures__/lifequest.js";
import * as reflectFx from "./__fixtures__/reflect.js";
import * as salesFx from "./__fixtures__/sales.js";

function runApply(fx, projectionId) {
  const projection = fx.projections[projectionId];
  const stripped = { ...projection };
  delete stripped.__originalSectionIds;
  const result = explainMatch(fx.intents, fx.ontology, stripped, {
    previewPatternId: "subcollections",
  });
  return {
    original: [...(projection.__originalSectionIds || [])].sort(),
    derived: (result.artifactAfter?.slots?.sections || [])
      .map((s) => s.id)
      .sort(),
    artifact: result.artifactAfter,
  };
}

describe("subcollections.structure.apply — snapshot regression", () => {
  // ─── CASE 1: invest/portfolio_detail — clean match (derived-path) ────
  // Projection без subCollections → apply выводит из онтологии.
  it("invest/portfolio_detail: apply матчит explicit (positions + transactions)", () => {
    const { original, derived } = runApply(investFx, "portfolio_detail");
    expect(original).toEqual(["positions", "transactions"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 2: lifequest/goal_detail — clean match (derived-path) ──────
  it("lifequest/goal_detail: apply матчит explicit (tasks)", () => {
    const { original, derived } = runApply(lifequestFx, "goal_detail");
    expect(original).toEqual(["tasks"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 3: reflect/hypothesis_detail — clean match (derived-path) ──
  // sectionIdFor("HypothesisEvidence") → "hypothesisevidences" (правило
  // "ends in s/x/z/ch/sh → +es" не срабатывает на "...ce"; regular +s).
  it("reflect/hypothesis_detail: apply матчит explicit (hypothesisevidences)", () => {
    const { original, derived } = runApply(reflectFx, "hypothesis_detail");
    expect(original).toEqual(["hypothesisevidences"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 4: planning/poll_overview — clean match (author-curation) ──
  // Автор явно задал subCollections=[TimeOption, Participant]. Apply — no-op.
  // artifactBefore уже содержит authored sections → derived == original.
  it("planning/poll_overview: author curation respected, apply no-op", () => {
    const { original, derived } = runApply(planningFx, "poll_overview");
    expect(original).toEqual(["participants", "timeoptions"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 5/6: delivery/{order_detail, cart} — clean match (author-curation) ──
  // Автор curated только OrderItem. Delivery/Payment/Review отбрасываются.
  // Теперь они матчат correct plural "deliveries" (pluralization fix).
  it("delivery/order_detail: author curation respected (apply no-op, только orderitems)", () => {
    const { original, derived } = runApply(deliveryFx, "order_detail");
    expect(original).toEqual(["orderitems"]);
    expect(derived).toEqual(original);
  });
  it("delivery/cart: author curation respected (apply no-op, только orderitems)", () => {
    const { original, derived } = runApply(deliveryFx, "cart");
    expect(original).toEqual(["orderitems"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 7: sales/listing_detail — clean match (author-curation) ────
  // Автор curated только Bid; Order/Watchlist/Message отбрасываются.
  it("sales/listing_detail: author curation respected (apply no-op)", () => {
    const { original, derived } = runApply(salesFx, "listing_detail");
    expect(original).toEqual(["bids"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 8: reflect/entry_detail — clean match (derived-path с suffix FK) ──
  // mainEntity=MoodEntry. Last camelCase-segment → "entry" → "entryId".
  // EntryActivity/EntryTag/HypothesisEvidence имеют entryId. В этой фикстуре
  // entry_detail не имеет HypothesisEvidence в assignment-семантике — она
  // принадлежит Hypothesis, но FK её — entryId. По последнему segment
  // convention apply её тоже находит. Этот "дополнительный" результат —
  // артефакт last-segment хевристики: entryId также есть в HypothesisEvidence.
  // Для snapshot-regression оставляем superset, original ⊂ derived.
  it("reflect/entry_detail: last-segment FK suffix (entryId) matches, original ⊂ derived", () => {
    const { original, derived } = runApply(reflectFx, "entry_detail");
    expect(original).toEqual(["entryactivities", "entrytags"]);
    expect(original.every((id) => derived.includes(id))).toBe(true);
  });

  // ─── CASE 9: sales/seller_profile — GAP (role-specific FK) ───────────
  // mainEntity=User. FK candidates: "userId" (+ single-segment). Authored
  // subCollections использовали sellerId (Listing) и targetUserId (Review) —
  // role-specific, не решаются без hint'ов в онтологии. Apply найдёт
  // Watchlist (userId) — не совпадает с original. Gap сохраняется.
  it("sales/seller_profile: role-specific FK остаётся gap (apply=watchlists, original=listings+reviews)", () => {
    const { original, derived } = runApply(salesFx, "seller_profile");
    expect(original).toEqual(["listings", "reviews"]);
    expect(derived).toEqual(["watchlists"]);
    expect(original.some((id) => derived.includes(id))).toBe(false);
  });
});
