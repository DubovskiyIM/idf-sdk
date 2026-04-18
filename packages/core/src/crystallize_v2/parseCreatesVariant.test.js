import { describe, it, expect } from "vitest";
import { parseCreatesVariant } from "./parseCreatesVariant.js";

describe("parseCreatesVariant", () => {
  it("'Task(bug)' → { entity: 'Task', variant: 'bug' }", () => {
    expect(parseCreatesVariant("Task(bug)")).toEqual({ entity: "Task", variant: "bug" });
  });

  it("'Task' → { entity: 'Task', variant: null }", () => {
    expect(parseCreatesVariant("Task")).toEqual({ entity: "Task", variant: null });
  });

  it("'Message(voice)' → { entity: 'Message', variant: 'voice' }", () => {
    expect(parseCreatesVariant("Message(voice)")).toEqual({ entity: "Message", variant: "voice" });
  });

  it("trims whitespace inside parens", () => {
    expect(parseCreatesVariant("Task( bug )")).toEqual({ entity: "Task", variant: "bug" });
  });

  it("null → { entity: null, variant: null }", () => {
    expect(parseCreatesVariant(null)).toEqual({ entity: null, variant: null });
    expect(parseCreatesVariant(undefined)).toEqual({ entity: null, variant: null });
    expect(parseCreatesVariant("")).toEqual({ entity: null, variant: null });
  });

  it("malformed 'Task(' → { entity: 'Task(', variant: null } (не падает)", () => {
    expect(parseCreatesVariant("Task(").variant).toBeNull();
  });
});
