// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { EventTimeline } from "./eventTimeline.jsx";

afterEach(cleanup);

describe("EventTimeline — causal-chain", () => {
  const events = [
    { id: "e1", kind: "created", at: "2026-04-18T14:13:00Z", actor: "u1", description: "PaymentIntent created" },
    { id: "e2", kind: "authorized", at: "2026-04-18T14:14:00Z", actor: "u1", description: "Payment authorized" },
  ];

  it("renders all event descriptions", () => {
    const { getByText } = render(
      <EventTimeline
        events={events}
        kind="causal-chain"
        atField="at"
        kindField="kind"
        actorField="actor"
        descriptionField="description"
      />
    );
    expect(getByText("PaymentIntent created")).toBeTruthy();
    expect(getByText("Payment authorized")).toBeTruthy();
  });

  it("renders kind badges", () => {
    const { getByText } = render(
      <EventTimeline
        events={events}
        kind="causal-chain"
        atField="at"
        kindField="kind"
        descriptionField="description"
      />
    );
    expect(getByText("created")).toBeTruthy();
    expect(getByText("authorized")).toBeTruthy();
  });

  it("empty events → null", () => {
    const { container } = render(
      <EventTimeline events={[]} kind="causal-chain" atField="at" />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("EventTimeline — snapshot", () => {
  const snapshots = [
    { id: "s1", at: "2026-04-18T14:15:00Z", quantity: 10, price: 150.2, value: 1502 },
    { id: "s2", at: "2026-04-18T14:10:00Z", quantity: 8, price: 150.0, value: 1200 },
  ];

  it("renders state fields as label:value pairs", () => {
    const { getAllByText } = render(
      <EventTimeline
        events={snapshots}
        kind="snapshot"
        atField="at"
        stateFields={["quantity", "price", "value"]}
      />
    );
    expect(getAllByText(/quantity/i).length).toBeGreaterThanOrEqual(2);
  });

  it("snapshot без atField — рендерит без timestamp (graceful)", () => {
    const { container } = render(
      <EventTimeline
        events={snapshots}
        kind="snapshot"
        atField={null}
        stateFields={["quantity"]}
      />
    );
    expect(container.firstChild).not.toBeNull();
  });
});
