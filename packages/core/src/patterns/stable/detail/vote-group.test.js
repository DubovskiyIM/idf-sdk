import { describe, it, expect } from "vitest";
import pattern from "./vote-group.js";

const pollIntents = [
  { id: "vote_yes", name: "Да", creates: "Vote(yes)" },
  { id: "vote_no", name: "Нет", creates: "Vote(no)" },
  { id: "vote_maybe", name: "Может быть", creates: "Vote(maybe)" },
  { id: "submit_comment", creates: "Comment" },  // не variant
];

describe("vote-group.structure.apply", () => {
  it("группирует vote intents по base entity → slots._voteGroups", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, { intents: pollIntents });
    expect(result._voteGroups.Vote).toHaveLength(3);
    expect(result._voteGroups.Vote.map(v => v.value)).toEqual(["yes", "no", "maybe"]);
  });

  it("intent.name → label в variant", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, { intents: pollIntents });
    expect(result._voteGroups.Vote[0]).toMatchObject({
      intentId: "vote_yes",
      value: "yes",
      label: "Да",
    });
  });

  it("intent без discriminator не попадает в group", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, { intents: pollIntents });
    expect(result._voteGroups.Comment).toBeUndefined();
  });

  it("< 2 variants в одной группе → не создаёт entry", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      intents: [{ id: "vote_yes", creates: "Vote(yes)" }],
    });
    expect(result).toBe(slots);
  });

  it("2+ разных base entities → обе в _voteGroups", () => {
    const intents = [
      { id: "review_approve", name: "Approve", creates: "Review(approve)" },
      { id: "review_reject", name: "Reject", creates: "Review(reject)" },
      { id: "vote_yes", creates: "Vote(yes)" },
      { id: "vote_no", creates: "Vote(no)" },
    ];
    const slots = {};
    const result = pattern.structure.apply(slots, { intents });
    expect(result._voteGroups.Review).toHaveLength(2);
    expect(result._voteGroups.Vote).toHaveLength(2);
  });

  it("idempotent: existing _voteGroups → no-op", () => {
    const slots = { _voteGroups: { old: [] } };
    const result = pattern.structure.apply(slots, { intents: pollIntents });
    expect(result).toBe(slots);
  });

  it("witness: _voteGroups._source = 'derived:vote-group'", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, { intents: pollIntents });
    expect(result._voteGroups._source).toBe("derived:vote-group");
  });
});
