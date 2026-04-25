/**
 * R0→R1 conservation property.
 *
 * Свойство: каждый intent, возвращённый accessibleIntents(), действительно
 * касается mainEntity проекции (intentTouchesEntity === true).
 *
 * R0: INTENTS + ONTOLOGY
 * R1: accessibleIntents(projection, role, INTENTS, ONTOLOGY) → filtered list
 */
import { describe, it } from "vitest";
import fc from "fast-check";
import { accessibleIntents, intentTouchesEntity } from "../accessibleIntents.js";
import { arbOntology, arbIntentSimple, arbRoleName } from "./generators.js";
import { expect } from "vitest";

describe("R0→R1 conservation", () => {
  it("каждый accessible intent действительно касается mainEntity проекции", () => {
    fc.assert(
      fc.property(
        arbOntology,
        arbRoleName,
        fc.array(arbIntentSimple("Booking"), { minLength: 0, maxLength: 5 }),
        (ontology, role, intentList) => {
          // Фиксируем entity: всегда Booking, чтобы тест был предсказуемым.
          const ONTOLOGY = {
            ...ontology,
            entities: {
              ...ontology.entities,
              Booking: {
                fields: { id: { canonicalType: "id" }, status: { canonicalType: "string" }, ownerId: { canonicalType: "id" } },
                ownerField: "ownerId",
              },
            },
          };
          const INTENTS = Object.fromEntries(
            intentList.map((intent, idx) => [`intent_${idx}`, intent])
          );
          const projection = { id: "booking_detail", archetype: "detail", mainEntity: "Booking" };

          const result = accessibleIntents(projection, role, INTENTS, ONTOLOGY);

          for (const intent of result) {
            expect(
              intentTouchesEntity(intent, "Booking"),
              `intent "${intent.id}" должен касаться Booking, но intentTouchesEntity вернул false`
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accessibleIntents не возвращает дублей по id", () => {
    fc.assert(
      fc.property(
        fc.array(arbIntentSimple("Task"), { minLength: 1, maxLength: 8 }),
        (intentList) => {
          const ONTOLOGY = {
            entities: { Task: { fields: { id: {}, status: {} } } },
            roles: { customer: { base: "owner" } },
          };
          const INTENTS = Object.fromEntries(
            intentList.map((intent, idx) => [`task_intent_${idx}`, intent])
          );
          const projection = { id: "task_detail", archetype: "detail", mainEntity: "Task" };
          const result = accessibleIntents(projection, "customer", INTENTS, ONTOLOGY);
          const ids = result.map((i) => i.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("при canExecute allowList — результат является подмножеством allowList", () => {
    fc.assert(
      fc.property(
        fc.array(arbIntentSimple("Order"), { minLength: 1, maxLength: 6 }),
        fc.array(fc.string({ minLength: 5, maxLength: 20 }).filter((s) => /^[a-z_]+$/.test(s)), { minLength: 1, maxLength: 4 }),
        (intentList, allowedIds) => {
          const ONTOLOGY = {
            entities: { Order: { fields: { id: {}, status: {} } } },
            roles: {
              restricted: { base: "viewer", canExecute: allowedIds },
            },
          };
          const INTENTS = Object.fromEntries(
            intentList.map((intent, idx) => [`order_int_${idx}`, intent])
          );
          const projection = { id: "order_detail", archetype: "detail", mainEntity: "Order" };
          const result = accessibleIntents(projection, "restricted", INTENTS, ONTOLOGY);
          const allowedSet = new Set(allowedIds);
          for (const intent of result) {
            expect(allowedSet.has(intent.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
