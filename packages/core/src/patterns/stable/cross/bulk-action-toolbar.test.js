import { describe, it, expect } from "vitest";
import pattern from "./bulk-action-toolbar.js";

describe("bulk-action-toolbar.structure.apply", () => {
  const bulkIntents = [
    { id: "bulk_archive", particles: { effects: [] } },
    { id: "bulk_mark_read", particles: { effects: [] } },
    { id: "send_message", particles: { effects: [] } },
  ];

  it("с ≥2 bulk_-intents → slots._bulkMode с actions", () => {
    const result = pattern.structure.apply({ toolbar: [] }, { intents: bulkIntents });
    expect(result._bulkMode).toMatchObject({
      enabled: true,
      actions: ["bulk_archive", "bulk_mark_read"],
      source: "derived:bulk-action-toolbar",
    });
  });

  it("с < 2 bulk_-intents → no-op", () => {
    const slots = { toolbar: [] };
    const result = pattern.structure.apply(slots, {
      intents: [{ id: "bulk_archive" }, { id: "send" }],
    });
    expect(result).toBe(slots);
  });

  it("не входит в action если id не bulk_-prefix", () => {
    const result = pattern.structure.apply({ toolbar: [] }, { intents: bulkIntents });
    expect(result._bulkMode.actions).not.toContain("send_message");
  });

  it("idempotent: existing _bulkMode → no-op", () => {
    const slots = { toolbar: [], _bulkMode: { enabled: true, actions: ["old"] } };
    const result = pattern.structure.apply(slots, { intents: bulkIntents });
    expect(result).toBe(slots);
  });

  it("сохраняет existing toolbar items", () => {
    const slots = { toolbar: [{ intentId: "search" }] };
    const result = pattern.structure.apply(slots, { intents: bulkIntents });
    expect(result.toolbar).toHaveLength(1);
    expect(result._bulkMode.enabled).toBe(true);
  });
});
