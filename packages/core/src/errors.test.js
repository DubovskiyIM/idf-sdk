import { describe, it, expect } from "vitest";
import { AnchoringError } from "./errors.js";

describe("AnchoringError", () => {
  it("содержит findings и domainId", () => {
    const findings = [{ rule: "anchoring_entity", level: "error", intent: "foo" }];
    const err = new AnchoringError(findings, "booking");
    expect(err.findings).toBe(findings);
    expect(err.domainId).toBe("booking");
    expect(err.name).toBe("AnchoringError");
    expect(err.message).toContain("booking");
    expect(err.message).toContain("1 structural misses");
  });

  it("instanceof Error", () => {
    const err = new AnchoringError([], "x");
    expect(err).toBeInstanceOf(Error);
  });
});
