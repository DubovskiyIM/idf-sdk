import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../src/promptBuilder.js";

describe("buildSystemPrompt", () => {
  it("содержит ключевые IDF-concept'ы", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("entity");
    expect(prompt).toContain("intent");
    expect(prompt).toContain("role");
    expect(prompt).toContain("ownerField");
    expect(prompt).toContain("relations");
  });

  it("упоминает формат suggestions (namedIntents, absorbHints, roles)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("namedIntents");
    expect(prompt).toContain("absorbHints");
    expect(prompt).toContain("additionalRoles");
    expect(prompt).toContain("baseRoles");
  });

  it("по умолчанию содержит хотя бы один example", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/example|пример/i);
  });

  it("deterministic: одинаковый input → одинаковый output (для cache-хеширования)", () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt());
    expect(buildSystemPrompt({ includeExamples: false })).toBe(
      buildSystemPrompt({ includeExamples: false })
    );
  });

  it("опция includeExamples: false → меньше текста", () => {
    const full = buildSystemPrompt({ includeExamples: true });
    const bare = buildSystemPrompt({ includeExamples: false });
    expect(bare.length).toBeLessThan(full.length);
  });
});
