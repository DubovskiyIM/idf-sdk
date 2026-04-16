/**
 * Шаблон smoke-теста: прогон crystallizeV2 и проверка артефакта.
 * Минимальная гарантия что сгенерированный домен — синтаксически валиден.
 */
export function render(ctx) {
  const { name } = ctx;
  return `import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "@intent-driven/core";
import { ontology, intents, projections } from "../domain.js";
import seed from "../seed.js";

describe("${name} — smoke", () => {
  it("кристаллизуется без ошибок", () => {
    const artifacts = crystallizeV2(intents, projections, ontology);
    expect(artifacts).toBeDefined();
    expect(Object.keys(artifacts).length).toBeGreaterThan(0);
  });

  it("у каждой проекции есть kind (архетип)", () => {
    for (const [, p] of Object.entries(projections)) {
      expect(p.kind).toMatch(/^(feed|catalog|detail|form|canvas|dashboard|wizard)$/);
    }
  });

  it("seed соответствует ontology — все коллекции из non-reference сущностей присутствуют", () => {
    const expectedCollections = Object.entries(ontology.entities)
      .filter(([, def]) => def.kind !== "reference")
      .map(([name]) => name[0].toLowerCase() + name.slice(1) + "s");
    for (const coll of expectedCollections) {
      expect(seed[coll], \`seed.\${coll} отсутствует\`).toBeDefined();
    }
  });

  it("каждое намерение имеет id и particles.entities", () => {
    for (const [, i] of Object.entries(intents)) {
      expect(i.id, \`intent без id\`).toBeTruthy();
      expect(i.particles?.entities, \`intent \${i.id} без particles.entities\`).toBeDefined();
    }
  });
});
`;
}
