import { describe, it } from "vitest";
import fc from "fast-check";
import { createValidator } from "../validator.js";
import { createInMemoryPersistence } from "../persistence/inMemory.js";

describe("cascadeReject — properties", () => {
  it("idempotent: second cascade on same root returns empty", async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.tuple(fc.uuid(), fc.oneof(fc.uuid(), fc.constant(null))),
        { minLength: 1, maxLength: 20 }
      ),
      async (effectsSpec) => {
        const persistence = createInMemoryPersistence();
        for (const [id, parent_id] of effectsSpec) {
          await persistence.appendEffect({
            id, parent_id,
            intent_id: "x", alpha: "add", target: "t",
            status: "confirmed",
            context: {},
            created_at: Date.now(),
          });
        }
        const validator = createValidator({
          persistence,
          ontology: { entities: {} },
          validateIntentConditions: () => ({ ok: true }),
        });
        const rootId = effectsSpec[0][0];
        await validator.cascadeReject(rootId, "test");
        const second = await validator.cascadeReject(rootId, "test");
        // Все дети первого вызова уже rejected — второй вызов не найдёт
        // детей со status !== "rejected" и вернёт пустой array.
        if (second.length > 0) {
          throw new Error(`second cascade returned ${second.length} items, expected 0`);
        }
      }
    ), { numRuns: 50 });
  });
});
