import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { Countdown } from "./Countdown.jsx";

afterEach(cleanup);

function makeCtx(timers) {
  return { world: { scheduledTimers: timers } };
}

describe("Countdown primitive (§6.5)", () => {
  it("рендерит null, если нет active timer", () => {
    const { container } = render(
      <Countdown target={{ id: "b1" }} ctx={makeCtx([])} targetEntity="Booking" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("рендерит null, если timer уже firedAt", () => {
    const { container } = render(
      <Countdown
        target={{ id: "b1" }}
        ctx={makeCtx([{ targetId: "b1", firesAt: "2030-01-01T00:00:00Z", firedAt: "2025-01-01T00:00:00Z" }])}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("рендерит формат HH:MM:SS для > 1h", () => {
    const firesAt = new Date(Date.now() + 2 * 3600 * 1000 + 30 * 60 * 1000).toISOString();
    const { container } = render(
      <Countdown
        target={{ id: "b1" }}
        ctx={makeCtx([{ targetId: "b1", firesAt, firedAt: null, fireIntent: "auto_cancel" }])}
      />
    );
    expect(container.textContent).toMatch(/2:29|2:30/);
    expect(container.textContent).toContain("auto cancel");
  });

  it("рендерит формат M:SS для < 1h", () => {
    const firesAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { container } = render(
      <Countdown
        target={{ id: "b1" }}
        ctx={makeCtx([{ targetId: "b1", firesAt, firedAt: null }])}
      />
    );
    expect(container.textContent).toMatch(/\b4:5\d|5:00\b/);
  });

  it("матчит по target.id — разные timer'ы не смешиваются", () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const { container } = render(
      <Countdown
        target={{ id: "b2" }}
        ctx={makeCtx([{ targetId: "b1", firesAt: future, firedAt: null }])}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
