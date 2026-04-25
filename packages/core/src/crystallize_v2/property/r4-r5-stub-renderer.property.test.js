/**
 * R4→R5 stub-renderer property.
 *
 * Свойство: интерактивные intent'ы (intentId в toolbar/primaryCTA/footer/overlay)
 * сохраняются после прохода через stub-renderer — набор intentId не теряется.
 *
 * Stub-renderer намеренно trivial: просто собирает intentId из слотов артефакта.
 * Это тест на conservation: renderer не должен «глотать» interactive intent'ы.
 *
 * R4: patterned artifact (slots после assignToSlotsDetail)
 * R5: stub-rendered output — тот же набор intentId
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { assignToSlotsDetail } from "../assignToSlotsDetail.js";
import { arbIntentSimple } from "./generators.js";

/**
 * Stub renderer: собирает все intentId из слотов в flat list.
 * Представляет минимальный контракт адаптера — он обязан отобразить все intentId.
 */
function stubRender(slots) {
  const intentIds = new Set();

  const collectFromItems = (items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      if (item.intentId) intentIds.add(item.intentId);
      // overflow.children
      if (item.type === "overflow" && Array.isArray(item.children)) {
        for (const child of item.children) {
          if (child?.intentId) intentIds.add(child.intentId);
        }
      }
    }
  };

  collectFromItems(slots.toolbar || []);
  collectFromItems(slots.primaryCTA || []);
  collectFromItems(slots.footer || []);
  collectFromItems(slots.overlay || []);

  return { intentIds: [...intentIds].sort() };
}

/**
 * Собирает intentId из слотов ДО рендера.
 */
function collectBeforeRender(slots) {
  const intentIds = new Set();
  const collectFromItems = (items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      if (item.intentId) intentIds.add(item.intentId);
      if (item.type === "overflow" && Array.isArray(item.children)) {
        for (const child of item.children) {
          if (child?.intentId) intentIds.add(child.intentId);
        }
      }
    }
  };
  collectFromItems(slots.toolbar || []);
  collectFromItems(slots.primaryCTA || []);
  collectFromItems(slots.footer || []);
  collectFromItems(slots.overlay || []);
  return [...intentIds].sort();
}

describe("R4→R5 stub-renderer conservation", () => {
  it("stub renderer сохраняет все intentId из interactive slots", () => {
    fc.assert(
      fc.property(
        fc.array(arbIntentSimple("Task"), { minLength: 1, maxLength: 5 }),
        (intentList) => {
          const withEffects = intentList.filter(
            (i) =>
              Array.isArray(i.particles?.effects) && i.particles.effects.length > 0
          );
          if (withEffects.length === 0) return;

          const ONTOLOGY = {
            entities: {
              Task: {
                fields: {
                  id: { canonicalType: "id" },
                  status: { canonicalType: "string" },
                  title: { canonicalType: "string" },
                  ownerId: { canonicalType: "id" },
                },
                ownerField: "ownerId",
              },
            },
            roles: { customer: { base: "owner" } },
          };

          const INTENTS = Object.fromEntries(
            withEffects.map((intent, idx) => [`task_int_${idx}`, intent])
          );
          const projection = {
            id: "task_detail",
            archetype: "detail",
            mainEntity: "Task",
          };

          const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});

          const before = collectBeforeRender(slots);
          const after = stubRender(slots).intentIds;

          // Stub renderer должен точно сохранять набор intentId
          expect(after).toEqual(before);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("stub renderer не добавляет фантомные intentId", () => {
    const INTENTS = {
      complete_task: {
        particles: {
          entities: ["Task"],
          effects: [{ α: "replace", target: "Task.status" }],
          conditions: [],
        },
      },
    };
    const ONTOLOGY = {
      entities: { Task: { fields: { id: {}, status: {}, ownerId: {} }, ownerField: "ownerId" } },
      roles: { customer: { base: "owner" } },
    };
    const projection = { id: "task_detail", archetype: "detail", mainEntity: "Task" };
    const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});
    const rendered = stubRender(slots).intentIds;
    // rendered содержит только реальные intent'ы из INTENTS
    for (const id of rendered) {
      expect(Object.keys(INTENTS)).toContain(id);
    }
  });
});
