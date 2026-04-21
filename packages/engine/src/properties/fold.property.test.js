import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createValidator } from "../validator.js";
import { createInMemoryPersistence } from "../persistence/inMemory.js";

// value передаётся как объект (не строка), поэтому JSON.parse не вызывается.
// Пустая строка "" специально исключена — validator.js ожидает JSON-строку или null.
const arbEffect = fc.record({
  id: fc.uuid(),
  intent_id: fc.constant("test"),
  alpha: fc.constantFrom("add", "replace", "remove"),
  target: fc.constantFrom("Foo", "Foo.name"),
  status: fc.constant("confirmed"),
  parent_id: fc.constant(null),
  value: fc.option(
    fc.record({ data: fc.string() }),
    { nil: null }
  ),
  context: fc.record({
    id: fc.uuid(),
    name: fc.option(fc.string()),
  }),
  created_at: fc.integer({ min: 1, max: 10_000_000 }),
});

describe("fold — determinism", () => {
  it("two independent folds of identical input produce identical world", async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(arbEffect, { minLength: 1, maxLength: 10 }),
      async (effects) => {
        const ontology = { entities: { Foo: {} } };

        const p1 = createInMemoryPersistence();
        for (const e of effects) await p1.appendEffect(e);
        const v1 = createValidator({
          persistence: p1, ontology,
          validateIntentConditions: () => ({ ok: true }),
        });
        const world1 = await v1.foldWorld();

        const p2 = createInMemoryPersistence();
        for (const e of effects) await p2.appendEffect(e);
        const v2 = createValidator({
          persistence: p2, ontology,
          validateIntentConditions: () => ({ ok: true }),
        });
        const world2 = await v2.foldWorld();

        expect(JSON.stringify(world1)).toBe(JSON.stringify(world2));
      }
    ), { numRuns: 50 });
  });
});
