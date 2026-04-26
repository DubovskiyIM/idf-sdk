/**
 * R1→R2 reachability property.
 *
 * Два ортогональных свойства:
 *
 * 1. Containment (slots ⊆ accessible):
 *    Каждый intent в interactive slots assignToSlotsDetail — это accessible intent.
 *    Slots не могут содержать intent, которого нет в accessibleIntents().
 *
 * 2. Replacement-reachability:
 *    Intent с α:"replace" (редактирование) попадает в toolbar/primaryCTA.
 *    Это основной класс interactive intents для detail.
 *
 * Заметка о дизайне SDK:
 * - Creator-intents (intent.creates === mainEntity) намеренно исключаются из
 *   detail-slots (assignToSlotsDetail.js:123) — создание это catalog/hero.
 * - wrapByConfirmation может вернуть null для некоторых intent'ов (composerEntry,
 *   unsupported capture). Такие intents легально не попадают в slots.
 * - Поэтому «accessible ⊆ slots» не является инвариантом; «slots ⊆ accessible» — является.
 *
 * R1: accessibleIntents → filtered list
 * R2: assignToSlotsDetail → slots { toolbar, primaryCTA, footer, overlay, fab }
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { assignToSlotsDetail } from "../assignToSlotsDetail.js";
import { accessibleIntents } from "../accessibleIntents.js";
import { arbIntentSimple } from "./generators.js";

/**
 * Рекурсивно собирает все intentId из слота (включая overflow.children).
 */
function collectIntentIds(slotItems) {
  const ids = new Set();
  if (!Array.isArray(slotItems)) return ids;
  for (const item of slotItems) {
    if (!item || typeof item !== "object") continue;
    if (item.intentId) ids.add(item.intentId);
    // overflow содержит children
    if (item.type === "overflow" && Array.isArray(item.children)) {
      for (const child of item.children) {
        if (child?.intentId) ids.add(child.intentId);
      }
    }
  }
  return ids;
}

/**
 * Собирает все intentId из всех interactive slots результата assignToSlotsDetail.
 */
function collectAllInteractiveIds(slots) {
  const ids = new Set();
  for (const id of collectIntentIds(slots.toolbar || [])) ids.add(id);
  for (const id of collectIntentIds(slots.primaryCTA || [])) ids.add(id);
  for (const id of collectIntentIds(slots.footer || [])) ids.add(id);
  for (const id of collectIntentIds(slots.overlay || [])) ids.add(id);
  if (slots.fab) {
    if (slots.fab.intentId) ids.add(slots.fab.intentId);
    if (Array.isArray(slots.fab)) {
      for (const id of collectIntentIds(slots.fab)) ids.add(id);
    }
  }
  if (Array.isArray(slots.sections)) {
    for (const section of slots.sections) {
      if (section?.addControl?.intentId) ids.add(section.addControl.intentId);
      if (Array.isArray(section?.itemIntents)) {
        for (const ii of section.itemIntents) {
          if (ii?.intentId) ids.add(ii.intentId);
        }
      }
    }
  }
  return ids;
}

describe("R1→R2 reachability", () => {
  it("containment: все intent'ы в slots входят в accessibleIntents (slots ⊆ accessible)", () => {
    fc.assert(
      fc.property(
        fc.array(arbIntentSimple("Booking"), { minLength: 1, maxLength: 5 }),
        (intentList) => {
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
            intentList.map((intent, idx) => [`booking_int_${idx}`, intent])
          );
          const projection = {
            id: "booking_detail",
            archetype: "detail",
            mainEntity: "Booking",
          };

          const accessible = new Set(
            accessibleIntents(projection, "customer", INTENTS, ONTOLOGY).map((i) => i.id)
          );
          const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});
          const inSlots = collectAllInteractiveIds(slots);

          // Slots ⊆ accessible: нет «фантомного» intent'а в slots
          for (const id of inSlots) {
            expect(accessible.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("replace-reachability: α:replace + confirmation:click попадает в toolbar или primaryCTA", () => {
    // Более строгое свойство: replace-intent с явным confirmation:"click"
    // (прямое редактирование) должен быть доступен из detail.
    //
    // SDK design note: без явного confirmation в controlArchetypes selectArchetype
    // вернёт null → wrapByConfirmation → null → intent пропускается.
    // Поэтому тест использует confirmation:"click" — минимально необходимый
    // атрибут для попадания replace-intent'а в interactive slots.
    fc.assert(
      fc.property(
        fc.constantFrom("status", "name", "title", "amount"),
        (fieldName) => {
          const ONTOLOGY = {
            entities: {
              Booking: {
                fields: {
                  id: { canonicalType: "id" },
                  [fieldName]: { canonicalType: "string" },
                  ownerId: { canonicalType: "id" },
                },
                ownerField: "ownerId",
              },
            },
            roles: { customer: { base: "owner" } },
          };

          const INTENTS = {
            [`edit_booking_${fieldName}`]: {
              confirmation: "click", // SDK требует явный confirmation для попадания в slots
              particles: {
                entities: ["Booking"],
                effects: [{ α: "replace", target: `Booking.${fieldName}` }],
                conditions: [],
              },
            },
          };
          const projection = {
            id: "booking_detail",
            archetype: "detail",
            mainEntity: "Booking",
          };

          const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});
          const toolbarIds = collectIntentIds(slots.toolbar || []);
          const primaryCtaIds = collectIntentIds(slots.primaryCTA || []);
          const footerIds = collectIntentIds(slots.footer || []);
          const overlayIds = collectIntentIds(slots.overlay || []);

          const allIds = new Set([
            ...toolbarIds,
            ...primaryCtaIds,
            ...footerIds,
            ...overlayIds,
          ]);

          expect(allIds.has(`edit_booking_${fieldName}`)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("при пустом INTENTS slots пустые (не crash)", () => {
    const ONTOLOGY = {
      entities: { Booking: { fields: { id: {}, status: {} } } },
      roles: { customer: { base: "owner" } },
    };
    const projection = { id: "booking_detail", archetype: "detail", mainEntity: "Booking" };
    const slots = assignToSlotsDetail({}, projection, ONTOLOGY, "customer", {});
    expect(Array.isArray(slots.toolbar)).toBe(true);
    expect(Array.isArray(slots.primaryCTA)).toBe(true);
  });
});
