/**
 * §12.4 — domain fallback в voice/document materializer.
 *
 * Без opts.domain раньше получали `«домена «»»` и `«Домен: »`. Теперь:
 *   - resolveDomain ищет в opts.ontology.name / opts.ontology.domain
 *   - При пустом fallback'e — текст вообще не упоминает домен
 *     (subtitle пуст, system prompt без `для домена «...»`)
 */
import { describe, it, expect } from "vitest";
import { materializeAsVoice } from "./voiceMaterializer.js";
import { materializeAsDocument } from "./documentMaterializer.js";

const proj = {
  id: "items",
  kind: "catalog",
  mainEntity: "Item",
  name: "Items",
  witnesses: ["title"],
};

const world = { items: [{ id: "1", title: "First" }] };
const viewer = { id: "u1", name: "Tester" };

describe("§12.4 — voiceMaterializer domain fallback", () => {
  it("opts.domain пустой + opts.ontology.name → используем ontology.name", () => {
    const ont = { name: "myApp", entities: { Item: { fields: { title: { type: "text", role: "primary-title" } } } } };
    const script = materializeAsVoice(proj, world, viewer, { ontology: ont });
    const sys = script.turns.find(t => t.role === "system");
    expect(sys.text).toContain("«myApp»");
    expect(script.subtitle).toBe("домен myApp");
    expect(script.meta.domain).toBe("myApp");
  });

  it("opts.domain пустой + opts.ontology.domain → используем ontology.domain", () => {
    const ont = { domain: "delivery", entities: { Item: { fields: { title: { type: "text", role: "primary-title" } } } } };
    const script = materializeAsVoice(proj, world, viewer, { ontology: ont });
    expect(script.meta.domain).toBe("delivery");
  });

  it("opts.domain имеет приоритет над ontology", () => {
    const ont = { name: "fallbackName" };
    const script = materializeAsVoice(proj, world, viewer, { ontology: ont, domain: "explicit" });
    expect(script.meta.domain).toBe("explicit");
    expect(script.turns[0].text).toContain("«explicit»");
  });

  it("ни domain, ни ontology — system prompt без `для домена «...»`", () => {
    const script = materializeAsVoice(proj, world, viewer, {});
    const sys = script.turns.find(t => t.role === "system");
    expect(sys.text).not.toContain("«»");
    expect(sys.text).not.toContain("домена");
    expect(sys.text).toContain("голосовой ассистент");
    expect(script.subtitle).toBe("");
    expect(script.meta.domain).toBe("");
  });
});

describe("§12.4 — documentMaterializer domain fallback", () => {
  it("opts.domain пустой + opts.ontology.name → используем ontology.name", () => {
    const ont = { name: "myApp", entities: { Item: { fields: { title: { type: "text", role: "primary-title" } } } } };
    const doc = materializeAsDocument(proj, world, viewer, { ontology: ont });
    expect(doc.subtitle).toBe("Домен: myApp");
    expect(doc.meta.domain).toBe("myApp");
  });

  it("opts.domain имеет приоритет", () => {
    const doc = materializeAsDocument(proj, world, viewer, { domain: "x", ontology: { name: "y" } });
    expect(doc.meta.domain).toBe("x");
    expect(doc.subtitle).toBe("Домен: x");
  });

  it("ни domain, ни ontology — subtitle пустой (не «Домен: »)", () => {
    const doc = materializeAsDocument(proj, world, viewer, {});
    expect(doc.subtitle).toBe("");
    expect(doc.meta.domain).toBe("");
  });
});
