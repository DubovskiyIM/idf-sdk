import { describe, it, expect } from "vitest";
import { intentReadFields, intentWriteFields } from "./intentFields.js";

describe("intentReadFields", () => {
  it("extracts field names from conditions[]", () => {
    const intent = {
      particles: {
        conditions: [
          { field: "Booking.status", op: "in", value: ["pending"] },
          { field: "Booking.customerId", op: "eq", value: "$viewer" }
        ]
      }
    };
    expect(intentReadFields(intent, "Booking").sort()).toEqual(["customerId", "status"]);
  });

  it("ignores conditions on other entities", () => {
    const intent = { particles: { conditions: [{ field: "Review.rating", op: "gt", value: 3 }] } };
    expect(intentReadFields(intent, "Booking")).toEqual([]);
  });
});

describe("intentWriteFields", () => {
  it("extracts field from effect.target with dotted path", () => {
    const intent = { particles: { effects: [{ α: "replace", target: "Booking.status", value: "cancelled" }] } };
    expect(intentWriteFields(intent, "Booking")).toEqual(["status"]);
  });

  it("treats α=create on entity as touching all required fields", () => {
    const intent = { particles: { effects: [{ α: "create", target: "Booking", payload: { customerId: "$viewer", serviceId: "$arg" } }] } };
    expect(intentWriteFields(intent, "Booking").sort()).toEqual(["customerId", "serviceId"]);
  });

  it("returns empty array when intent does not touch entity", () => {
    const intent = { particles: { effects: [{ α: "create", target: "Review" }] } };
    expect(intentWriteFields(intent, "Booking")).toEqual([]);
  });
});
