import { describe, it, expect } from "vitest";
import pattern from "./antagonist-toggle.js";

const pairIntents = [
  { id: "pin_message", antagonist: "unpin_message" },
  { id: "unpin_message", antagonist: "pin_message" },
  { id: "mute_conv", antagonist: "unmute_conv" },
  { id: "unmute_conv", antagonist: "mute_conv" },
  { id: "send", antagonist: null },
];

describe("antagonist-toggle.structure.apply", () => {
  it("emit _toggles с антагонист-парами", () => {
    const result = pattern.structure.apply({}, { intents: pairIntents });
    expect(result._toggles).toHaveLength(2);
    const pairKeys = result._toggles.map(t => [t.a, t.b].sort().join("::"));
    expect(pairKeys).toEqual(expect.arrayContaining([
      "pin_message::unpin_message",
      "mute_conv::unmute_conv",
    ]));
  });

  it("_togglesSource = 'derived:antagonist-toggle'", () => {
    const result = pattern.structure.apply({}, { intents: pairIntents });
    expect(result._togglesSource).toBe("derived:antagonist-toggle");
  });

  it("без antagonist-intents → no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      intents: [{ id: "send" }, { id: "delete" }],
    });
    expect(result).toBe(slots);
  });

  it("idempotent: existing _toggles → no-op", () => {
    const slots = { _toggles: [{ a: "old", b: "old2" }] };
    const result = pattern.structure.apply(slots, { intents: pairIntents });
    expect(result).toBe(slots);
  });

  it("dedup: пары не дублируются (A→B и B→A учитываются как один)", () => {
    const result = pattern.structure.apply({}, { intents: pairIntents });
    expect(result._toggles.length).toBe(2);
  });

  it("antagonist без реального partner → skip", () => {
    const result = pattern.structure.apply({}, {
      intents: [
        { id: "a", antagonist: "missing" },
      ],
    });
    expect(result).toEqual({});
  });
});
