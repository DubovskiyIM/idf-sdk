// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SubCollectionSection from "./SubCollectionSection.jsx";

afterEach(cleanup);

describe("SubCollectionSection — temporal renderAs branching", () => {
  const events = [
    { id: "e1", paymentId: "p1", kind: "created", at: "2026-04-18T14:13:00Z", actor: "u1", description: "Created" },
    { id: "e2", paymentId: "p1", kind: "authorized", at: "2026-04-18T14:14:00Z", actor: "u1", description: "Authorized" },
  ];
  const ctx = { world: { events }, viewer: { id: "u1" } };

  it("section.renderAs=eventTimeline causal-chain → рендерит через EventTimeline", () => {
    const section = {
      id: "events",
      title: "Timeline",
      source: "events",
      foreignKey: "paymentId",
      itemEntity: "PaymentEvent",
      renderAs: {
        type: "eventTimeline",
        kind: "causal-chain",
        atField: "at",
        kindField: "kind",
        actorField: "actor",
        descriptionField: "description",
      },
    };
    const target = { id: "p1" };
    const { getByText } = render(<SubCollectionSection section={section} target={target} ctx={ctx} />);
    expect(getByText("Created")).toBeTruthy();
    expect(getByText("Authorized")).toBeTruthy();
    expect(getByText(/Timeline \(2\)/)).toBeTruthy();
  });

  it("пустая коллекция + renderAs=eventTimeline → null", () => {
    const section = {
      id: "events",
      title: "Timeline",
      source: "events",
      foreignKey: "paymentId",
      renderAs: { type: "eventTimeline", kind: "causal-chain", atField: "at" },
    };
    const emptyCtx = { world: { events: [] }, viewer: { id: "u1" } };
    const { container } = render(<SubCollectionSection section={section} target={{ id: "p1" }} ctx={emptyCtx} />);
    expect(container.firstChild).toBeNull();
  });
});
