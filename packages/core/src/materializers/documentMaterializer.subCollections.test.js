/**
 * documentMaterializer — `subCollection.entity` resolution (backlog §13.12).
 *
 * До fix'а material-er искал `world[sub.collection]` (legacy plural string),
 * а IDF-spec и `materializeCatalog::findCollection` использовали
 * `pluralize(entity.toLowerCase())`. CamelCase entities (`Intent`,
 * `BacklogItem`) роняли lookup и subCollections-секции оставались пустыми.
 */
import { describe, it, expect } from "vitest";
import { materializeAsDocument } from "./documentMaterializer.js";

const projection = {
  id: "domain_detail",
  archetype: "detail",
  mainEntity: "Domain",
  idParam: "domainId",
  witnesses: ["name", "title"],
  subCollections: [
    { entity: "Intent", foreignKey: "domainId", title: "Intents" },
    { entity: "RRule", foreignKey: "domainId", title: "Reactive Rules" },
  ],
};

const world = {
  domains: [{ id: "booking", name: "booking", title: "📅 Бронирование" }],
  intents: [
    { id: "create_booking", domainId: "booking", name: "Создать бронь" },
    { id: "cancel_booking", domainId: "booking", name: "Отменить" },
    { id: "x_other", domainId: "other", name: "Other domain" },
  ],
  rrules: [
    { id: "r1", domainId: "booking", name: "Авто-отмена" },
  ],
};

const viewer = { id: "u1", name: "Test" };

describe("documentMaterializer / subCollections.entity (§13.12)", () => {
  it("resolves subCollection.entity через findCollection (CamelCase entity)", () => {
    const doc = materializeAsDocument(projection, world, viewer, {
      domain: "meta",
      routeParams: { domainId: "booking" },
    });
    const subSections = doc.sections.filter((s) => s.id?.startsWith("sub_"));
    const intentSec = subSections.find((s) => s.id === "sub_Intent");
    const ruleSec = subSections.find((s) => s.id === "sub_RRule");
    expect(intentSec).toBeDefined();
    expect(intentSec.rowCount).toBe(2); // оба booking-intent'а, x_other отфильтрован
    expect(ruleSec).toBeDefined();
    expect(ruleSec.rowCount).toBe(1);
    expect(ruleSec.heading).toBe("Reactive Rules");
  });

  it("legacy форма sub.collection всё ещё работает (backwards compat)", () => {
    const legacyProj = {
      ...projection,
      subCollections: [
        { collection: "intents", foreignKey: "domainId", title: "Intents (legacy)" },
      ],
    };
    const doc = materializeAsDocument(legacyProj, world, viewer, {
      domain: "meta",
      routeParams: { domainId: "booking" },
    });
    const intentSec = doc.sections.find((s) => s.id === "sub_intents");
    expect(intentSec).toBeDefined();
    expect(intentSec.rowCount).toBe(2);
  });

  it("entity-форма приоритетнее, если оба заданы", () => {
    const bothProj = {
      ...projection,
      subCollections: [
        { entity: "Intent", collection: "wrong-collection", foreignKey: "domainId" },
      ],
    };
    const doc = materializeAsDocument(bothProj, world, viewer, {
      domain: "meta",
      routeParams: { domainId: "booking" },
    });
    const intentSec = doc.sections.find((s) => s.id === "sub_Intent");
    expect(intentSec).toBeDefined();
    expect(intentSec.rowCount).toBe(2);
  });
});
