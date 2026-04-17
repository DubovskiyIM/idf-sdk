// snapshot.test.js
//
// Regression snapshot: для каждой проекции из реальных доменов idf/, где
// author'ом декларирован subCollections (explicit override), проверяем что
// subcollections.structure.apply воспроизводит тот же набор section.id.
//
// Если apply выводит ту же коллекцию ids — override безопасно удалить.
// Если apply выводит НАДмножество или несовпадающее множество — это gap,
// документируемый ниже.
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
  // Projection приходит без subCollections — apply должен вывести сам.
  const stripped = { ...projection };
  delete stripped.__originalSectionIds;
  const result = explainMatch(fx.intents, fx.ontology, stripped, {
    previewPatternId: "subcollections",
  });
  return {
    original: [...(projection.__originalSectionIds || [])].sort(),
    // explainMatch теперь корректно кладёт результат apply в slots.sections
    // (fix: apply работает на slots, не на артефакте).
    derived: (result.artifactAfter?.slots?.sections || [])
      .map((s) => s.id)
      .sort(),
    artifact: result.artifactAfter,
  };
}

describe("subcollections.structure.apply — snapshot regression", () => {
  // ─── CASE 1: invest/portfolio_detail — exact match ───────────────────
  it("invest/portfolio_detail: apply матчит explicit (positions + transactions)", () => {
    const { original, derived } = runApply(investFx, "portfolio_detail");
    expect(original).toEqual(["positions", "transactions"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 2: lifequest/goal_detail — exact match ─────────────────────
  it("lifequest/goal_detail: apply матчит explicit (tasks)", () => {
    const { original, derived } = runApply(lifequestFx, "goal_detail");
    expect(original).toEqual(["tasks"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 3: reflect/hypothesis_detail — exact match ─────────────────
  it("reflect/hypothesis_detail: apply матчит explicit (hypothesisevidences)", () => {
    const { original, derived } = runApply(reflectFx, "hypothesis_detail");
    expect(original).toEqual(["hypothesisevidences"]);
    expect(derived).toEqual(original);
  });

  // ─── CASE 4: planning/poll_overview — GAP (apply=overproduction) ─────
  // Explicit subCollections: [TimeOption, Participant]. Apply по convention
  // также найдёт Vote и Meeting (оба имеют pollId). Документируем как gap:
  // domain author сделал кураторский выбор, apply не различает эту семантику.
  it("planning/poll_overview: apply — superset (gap: Vote + Meeting также найдены)", () => {
    const { original, derived } = runApply(planningFx, "poll_overview");
    expect(original).toEqual(["participants", "timeoptions"]);
    // Apply находит все 4 entity с pollId
    expect(derived).toEqual(["meetings", "participants", "timeoptions", "votes"]);
    // Original ⊂ derived
    expect(original.every((id) => derived.includes(id))).toBe(true);
  });

  // ─── CASE 5/6: delivery/{order_detail, cart} — GAP (apply=overproduction + naive plural) ───
  // Explicit только OrderItem; apply также найдёт Delivery, Payment, Review
  // (все с orderId). Плюс naive pluralization "Delivery" → "deliverys"
  // (вместо "deliveries") — отдельный gap в sectionIdFor.
  it("delivery/order_detail: apply — superset (gap: Delivery/Payment/Review + naive plural)", () => {
    const { original, derived } = runApply(deliveryFx, "order_detail");
    expect(original).toEqual(["orderitems"]);
    expect(derived).toEqual(["deliverys", "orderitems", "payments", "reviews"]);
    expect(original.every((id) => derived.includes(id))).toBe(true);
  });
  it("delivery/cart: apply — superset (тот же gap что order_detail)", () => {
    const { original, derived } = runApply(deliveryFx, "cart");
    expect(original).toEqual(["orderitems"]);
    expect(derived).toEqual(["deliverys", "orderitems", "payments", "reviews"]);
    expect(original.every((id) => derived.includes(id))).toBe(true);
  });

  // ─── CASE 7: sales/listing_detail — GAP (apply=overproduction) ───────
  // Explicit только Bid; apply также найдёт Order, Watchlist, Message
  // (все имеют listingId).
  it("sales/listing_detail: apply — superset (gap: Order/Watchlist/Message)", () => {
    const { original, derived } = runApply(salesFx, "listing_detail");
    expect(original).toEqual(["bids"]);
    expect(derived).toEqual(["bids", "messages", "orders", "watchlists"]);
    expect(original.every((id) => derived.includes(id))).toBe(true);
  });

  // ─── CASE 8: reflect/entry_detail — GAP (apply=zero) ─────────────────
  // mainEntity=MoodEntry → convention fkField = "moodentryId", но real FK
  // называется "entryId". Apply ничего не найдёт. Original нельзя вывести.
  it("reflect/entry_detail: apply пропускает (gap: explicit FK 'entryId' не matches convention 'moodentryId')", () => {
    const { original, derived } = runApply(reflectFx, "entry_detail");
    expect(original).toEqual(["entryactivities", "entrytags"]);
    // Apply returns 0 sections — naming mismatch
    expect(derived).toEqual([]);
  });

  // ─── CASE 9: sales/seller_profile — GAP (apply=mismatch) ─────────────
  // mainEntity=User, convention fkField="userId". Explicit sub-entities:
  // Listing (sellerId) + Review (targetUserId) — ни один не совпадает с userId.
  // Apply найдёт Watchlist (имеет userId), но его нет в original.
  it("sales/seller_profile: apply расходится (gap: FK naming + лишняя Watchlist)", () => {
    const { original, derived } = runApply(salesFx, "seller_profile");
    expect(original).toEqual(["listings", "reviews"]);
    // Apply по convention userId найдёт Watchlist (и не найдёт Listing/Review).
    expect(derived).toEqual(["watchlists"]);
    // Ни один original id не воспроизведён
    expect(original.some((id) => derived.includes(id))).toBe(false);
  });
});
