import { describe, it, expect } from "vitest";
import { applyInformationBottleneck } from "./informationBottleneck.js";

const ONTOLOGY = {
  entities: {
    Booking: {
      fields: { id: {}, status: {}, customerId: {}, internalNote: {}, retentionFlag: {} }
    }
  },
  roles: { customer: { base: "owner" } }
};

const INTENTS = {
  create_booking: { particles: { effects: [{ α: "create", target: "Booking", payload: { customerId: 1 } }] } },
  cancel_booking: { particles: {
    effects: [{ α: "replace", target: "Booking.status" }],
    conditions: [{ field: "Booking.status", op: "in", value: ["pending"] }]
  } }
};

it("includes only fields touched by accessible intents", () => {
  const projection = { id: "booking_detail", mainEntity: "Booking" };
  const { fields, witness } = applyInformationBottleneck({
    projection, role: "customer", INTENTS, ONTOLOGY
  });
  expect(fields.sort()).toEqual(["customerId", "status"]);
  expect(witness.basis).toBe("information-bottleneck");
  expect(witness.excluded.sort()).toEqual(["id", "internalNote", "retentionFlag"]);
});

it("respects projection.uiSchema.includeFields override", () => {
  const projection = {
    id: "booking_detail", mainEntity: "Booking",
    uiSchema: { includeFields: ["id"] }
  };
  const { fields } = applyInformationBottleneck({
    projection, role: "customer", INTENTS, ONTOLOGY
  });
  expect(fields).toContain("id");
});

it("respects projection.uiSchema.excludeFields override", () => {
  const projection = {
    id: "booking_detail", mainEntity: "Booking",
    uiSchema: { excludeFields: ["status"] }
  };
  const { fields } = applyInformationBottleneck({
    projection, role: "customer", INTENTS, ONTOLOGY
  });
  expect(fields).not.toContain("status");
});
