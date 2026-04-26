import { describe, it, expect } from "vitest";
import { accessibleIntents } from "./accessibleIntents.js";

describe("accessibleIntents", () => {
  const ONTOLOGY = {
    entities: { Booking: { fields: { id: {}, status: {}, customerId: {} }, ownerField: "customerId" } },
    roles: { customer: { base: "owner" } }
  };
  const INTENTS = {
    create_booking: { creates: "Booking", particles: { effects: [{ α: "create", target: "Booking" }], entities: ["Booking"] } },
    cancel_booking: { particles: { effects: [{ α: "replace", target: "Booking.status" }], entities: ["Booking"], conditions: [{ field: "Booking.status", op: "in", value: ["pending"] }] } },
    review_booking: { creates: "Review", particles: { effects: [{ α: "create", target: "Review" }], entities: ["Review"] } }
  };
  const projection = { id: "booking_detail", archetype: "detail", mainEntity: "Booking" };

  it("returns intents touching mainEntity", () => {
    const result = accessibleIntents(projection, "customer", INTENTS, ONTOLOGY);
    expect(result.map(i => i.id).sort()).toEqual(["cancel_booking", "create_booking"]);
  });

  it("excludes intents on unrelated entities", () => {
    const result = accessibleIntents(projection, "customer", INTENTS, ONTOLOGY);
    expect(result.find(i => i.id === "review_booking")).toBeUndefined();
  });

  it("respects role.canExecute when present", () => {
    const restricted = { ...ONTOLOGY, roles: { customer: { base: "owner", canExecute: ["create_booking"] } } };
    const result = accessibleIntents(projection, "customer", INTENTS, restricted);
    expect(result.map(i => i.id)).toEqual(["create_booking"]);
  });
});
