/**
 * fast-check генераторы для property-based тестов R0→R5.
 *
 * Используются в:
 *   - r0-r1-conservation.property.test.js
 *   - r1-r2-reachability.property.test.js
 *   - r2-r3-primary-slot.property.test.js
 *   - r3-r4-adapter-capability.property.test.js
 *   - r4-r5-stub-renderer.property.test.js
 */
import fc from "fast-check";

export const arbFieldName = fc.constantFrom(
  "id", "status", "name", "amount", "createdAt", "ownerId", "phase", "title", "note"
);

export const arbRoleName = fc.constantFrom("customer", "admin", "viewer", "agent", "owner");

export const arbEntity = fc.record({
  fields: fc.dictionary(
    arbFieldName,
    fc.constantFrom(
      { canonicalType: "string" },
      { canonicalType: "id" },
      { canonicalType: "number" }
    ),
    { minKeys: 2, maxKeys: 6 }
  ),
  ownerField: fc.option(fc.constantFrom("ownerId", "customerId"), { nil: undefined }),
});

export const arbOntology = fc.record({
  entities: fc.dictionary(
    fc.constantFrom("Booking", "Order", "Review", "Task"),
    arbEntity,
    { minKeys: 1, maxKeys: 3 }
  ),
  roles: fc.dictionary(
    arbRoleName,
    fc.record({ base: fc.constantFrom("owner", "admin", "viewer", "agent") }),
    { minKeys: 1, maxKeys: 3 }
  ),
});

export const arbIntentSimple = (entityName) =>
  fc.record({
    particles: fc.record({
      entities: fc.constant([entityName]),
      effects: fc.array(
        fc.record({
          α: fc.constantFrom("create", "replace", "remove"),
          target: fc.oneof(
            fc.constant(entityName),
            fc
              .tuple(fc.constant(entityName), arbFieldName)
              .map(([e, f]) => `${e}.${f}`)
          ),
        }),
        { minLength: 0, maxLength: 3 }
      ),
      conditions: fc.array(
        fc.record({
          field: fc
            .tuple(fc.constant(entityName), arbFieldName)
            .map(([e, f]) => `${e}.${f}`),
          op: fc.constantFrom("eq", "in", "gt"),
          value: fc.anything(),
        }),
        { minLength: 0, maxLength: 2 }
      ),
    }),
  });

export const arbProjection = (mainEntity) =>
  fc.record({
    id: fc
      .string({ minLength: 4, maxLength: 16 })
      .filter((s) => /^[a-z][a-z0-9_]*$/.test(s)),
    archetype: fc.constantFrom("detail", "catalog", "feed"),
    mainEntity: fc.constant(mainEntity),
  });
