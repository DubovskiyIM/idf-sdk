import { describe, it, expect } from "vitest";
import {
  witnessToItemChild,
  buildWitnessChildren,
  findHeroImageWitness,
  splitWitnessPath,
} from "./witnessItemChildren.js";

const freelanceOntology = {
  entities: {
    Task: {
      fields: {
        id: { type: "text" },
        title: { type: "text" },
        description: { type: "textarea" },
        budget: { type: "number", fieldRole: "money" },
        deadline: { type: "datetime" },
        status: { type: "enum", values: ["draft", "published", "in_progress", "completed"] },
        categoryId: { type: "entityRef" },
        createdAt: { type: "datetime" },
      },
    },
    Listing: {
      fields: {
        id: { type: "text" },
        title: { type: "text" },
        price: { type: "number" },
        photos: { type: "multiImage" },
        location: { type: "text" },
      },
    },
  },
};

describe("splitWitnessPath", () => {
  it("plain field → fieldName=bind=field", () => {
    expect(splitWitnessPath("title", "Task")).toEqual({ fieldName: "title", bind: "title" });
  });
  it("self-aliased task.title → bind=title (strip алиас)", () => {
    expect(splitWitnessPath("task.title", "Task")).toEqual({ fieldName: "title", bind: "title" });
  });
  it("case-insensitive alias strip", () => {
    expect(splitWitnessPath("TASK.title", "Task")).toEqual({ fieldName: "title", bind: "title" });
  });
  it("cross-entity owner.name → bind=owner.name, fieldName=name", () => {
    expect(splitWitnessPath("owner.name", "Task")).toEqual({ fieldName: "name", bind: "owner.name" });
  });
  it("non-string → null", () => {
    expect(splitWitnessPath(42, "Task")).toBeNull();
    expect(splitWitnessPath(null, "Task")).toBeNull();
  });
});

describe("witnessToItemChild — role→primitive mapping", () => {
  it("title → text heading", () => {
    const node = witnessToItemChild("title", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "title", style: "heading" });
  });

  it("money-fieldRole → text currency money", () => {
    const node = witnessToItemChild("budget", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "budget", format: "currency", style: "money" });
  });

  it("datetime deadline → timer (inline countdown)", () => {
    const node = witnessToItemChild("deadline", "Task", freelanceOntology);
    expect(node).toEqual({ type: "timer", bind: "deadline" });
  });

  it("enum status → badge", () => {
    const node = witnessToItemChild("status", "Task", freelanceOntology);
    expect(node).toEqual({ type: "badge", bind: "status" });
  });

  it("textarea description → text secondary", () => {
    const node = witnessToItemChild("description", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "description", style: "secondary" });
  });

  it("multiImage photos → avatar (heroImage role)", () => {
    const node = witnessToItemChild("photos", "Listing", freelanceOntology);
    expect(node).toEqual({ type: "avatar", bind: "photos", size: 40 });
  });

  it("createdAt timestamp → text datetime secondary", () => {
    const node = witnessToItemChild("createdAt", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "createdAt", style: "secondary", format: "datetime" });
  });

  it("price (heuristic, not explicit money) → text currency money", () => {
    const node = witnessToItemChild("price", "Listing", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "price", format: "currency", style: "money" });
  });

  it("fallback info → text без стиля", () => {
    const node = witnessToItemChild("id", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "id" });
  });

  it("self-aliased task.title → bind без prefix", () => {
    const node = witnessToItemChild("task.title", "Task", freelanceOntology);
    expect(node).toEqual({ type: "text", bind: "title", style: "heading" });
  });

  it("computed witness { field, compute } → text с compute", () => {
    const node = witnessToItemChild(
      { field: "responseCount", compute: "count(responses)" },
      "Task",
      freelanceOntology,
    );
    expect(node).toEqual({
      type: "text",
      bind: "responseCount",
      compute: "count(responses)",
      style: "secondary",
      format: "number",
    });
  });

  it("ontology без entity → text fallback", () => {
    const node = witnessToItemChild("title", "UnknownEntity", { entities: {} });
    // title — name-heuristic без fieldDef → role=title → heading
    expect(node).toEqual({ type: "text", bind: "title", style: "heading" });
  });
});

describe("buildWitnessChildren", () => {
  it("Workzilla-like task_list.witnesses → 4 корректных node'а", () => {
    const witnesses = ["title", "budget", "deadline", "status"];
    const children = buildWitnessChildren(witnesses, "Task", freelanceOntology);
    expect(children).toHaveLength(4);
    expect(children[0]).toMatchObject({ type: "text", bind: "title", style: "heading" });
    expect(children[1]).toMatchObject({ type: "text", bind: "budget", format: "currency" });
    expect(children[2]).toMatchObject({ type: "timer", bind: "deadline" });
    expect(children[3]).toMatchObject({ type: "badge", bind: "status" });
  });

  it("пустой массив → []", () => {
    expect(buildWitnessChildren([], "Task", freelanceOntology)).toEqual([]);
  });

  it("null → []", () => {
    expect(buildWitnessChildren(null, "Task", freelanceOntology)).toEqual([]);
  });
});

describe("findHeroImageWitness", () => {
  it("находит multiImage/photos по роли heroImage", () => {
    const res = findHeroImageWitness(
      ["title", "photos", "price"],
      "Listing",
      freelanceOntology,
    );
    expect(res).toEqual({ bind: "photos", witness: "photos" });
  });
  it("возвращает null если нет image-поля среди witness'ов", () => {
    const res = findHeroImageWitness(
      ["title", "budget", "deadline"],
      "Task",
      freelanceOntology,
    );
    expect(res).toBeNull();
  });
});
