/**
 * R2→R3 primary slot property.
 *
 * Свойство: intent с наибольшим salience (по computeSalience) попадает
 * в primaryCTA (если phase-transition) или в первые 2 элемента toolbar.
 *
 * TODO: После merge Phase 2 (feat/salience-explicit-weights) — refactor
 * на salienceFromFeatures(extractSalienceFeatures(...)) вместо computeSalience.
 * Текущая реализация использует computeSalience из salience.js (Phase 1 baseline).
 *
 * Тест намеренно нестрогий: проверяем, что winner попадает в первые 2 элемента
 * toolbar ИЛИ в primaryCTA — потому что computeSalience может давать равные значения
 * для нескольких intent'ов, а порядок внутри тай-группы зависит от declarationOrder.
 *
 * R2: slots (assignToSlotsDetail)
 * R3: applyStructuralPatterns — пока не тестируем apply, только slot assignment
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { assignToSlotsDetail } from "../assignToSlotsDetail.js";
import { computeSalience } from "../salience.js";
import { normalizeCreates } from "../assignToSlotsShared.js";
import { arbIntentSimple } from "./generators.js";

describe("R2→R3 primary slot invariant", () => {
  it("intent с наибольшим salience попадает в primaryCTA или первые 2 элемента toolbar", () => {
    fc.assert(
      fc.property(
        fc.array(arbIntentSimple("Booking"), { minLength: 2, maxLength: 5 }),
        (intentList) => {
          // Фильтруем только интенты с эффектами
          const withEffects = intentList.filter(
            (i) => Array.isArray(i.particles?.effects) && i.particles.effects.length > 0
          );
          if (withEffects.length < 2) return; // нужно минимум 2 для сравнения

          const ONTOLOGY = {
            entities: {
              Booking: {
                fields: {
                  id: { canonicalType: "id" },
                  status: { canonicalType: "string" },
                  ownerId: { canonicalType: "id" },
                },
                ownerField: "ownerId",
              },
            },
            roles: { customer: { base: "owner" } },
          };

          const INTENTS = Object.fromEntries(
            withEffects.map((intent, idx) => [`bk_int_${idx}`, intent])
          );
          const projection = {
            id: "booking_detail",
            archetype: "detail",
            mainEntity: "Booking",
          };

          // SDK design note: creator-intents (creates === mainEntity) пропускаются
          // из detail-slots по assignToSlotsDetail.js:123. Они не попадают ни в
          // toolbar, ни в primaryCTA. Исключаем их из рассмотрения.
          const nonCreatorEntries = Object.entries(INTENTS).filter(
            ([, intent]) => normalizeCreates(intent.creates) !== "Booking"
          );
          if (nonCreatorEntries.length < 2) return; // только creator'ы — degenerate

          // Находим intent с максимальным salience среди non-creator
          const scores = nonCreatorEntries.map(([id, intent]) => ({
            id,
            salience: computeSalience({ ...intent, id }, "Booking").value,
          }));
          scores.sort((a, b) => b.salience - a.salience);
          const maxSalience = scores[0].salience;

          // Несколько intent'ов могут иметь одинаковый maxSalience (тай-группа)
          const topTied = scores
            .filter((s) => s.salience === maxSalience)
            .map((s) => s.id);

          const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});

          // Собираем первые 2 toolbar + весь primaryCTA
          const toolbar = (slots.toolbar || []).filter(
            (item) => item?.intentId && item.type !== "overflow"
          );
          const primarySlotIds = new Set([
            ...(slots.primaryCTA || [])
              .map((s) => s.intentId)
              .filter(Boolean),
            ...toolbar.slice(0, 2).map((s) => s.intentId).filter(Boolean),
          ]);

          // Если primarySlotIds пустой — нет интерактивных слотов вообще (read-only intents)
          if (primarySlotIds.size === 0) return;

          // Хотя бы один из tied-топов должен быть в primary slots
          const atLeastOneTopInPrimary = topTied.some((id) =>
            primarySlotIds.has(id)
          );
          expect(atLeastOneTopInPrimary).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
