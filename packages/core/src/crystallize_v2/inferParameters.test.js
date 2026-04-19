import { describe, it, expect } from "vitest";
import { inferParameters } from "./inferParameters.js";

const ONTOLOGY = {
  entities: {
    Message: { fields: ["id", "conversationId", "senderId", "content", "createdAt", "status"] },
    User:    { fields: ["id", "name", "avatar", "status"] },
    Conversation: { fields: ["id", "type", "title", "createdAt"] },
  },
};

describe("inferParameters", () => {
  it("явный parameters-override побеждает", () => {
    const intent = {
      particles: { witnesses: ["draft_text"], confirmation: "enter" },
      parameters: [{ name: "text", type: "text", required: true }],
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toEqual([{ name: "text", type: "text", required: true }]);
  });

  it("particles.parameters принимается как fallback при отсутствии top-level (backlog 4.1)", () => {
    const intent = {
      particles: {
        parameters: [
          { name: "title", type: "text", required: true },
          { name: "price", type: "number" },
        ],
        witnesses: [],
      },
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toEqual([
      { name: "title", type: "text", required: true },
      { name: "price", type: "number" },
    ]);
  });

  it("top-level parameters имеет приоритет над particles.parameters", () => {
    const intent = {
      parameters: [{ name: "override" }],
      particles: { parameters: [{ name: "ignored" }] },
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toEqual([{ name: "override" }]);
  });

  it("инференция из witness без точки → параметр", () => {
    const intent = {
      particles: {
        witnesses: ["conversation.title", "draft_text"],
        confirmation: "enter",
      },
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("draft_text");
  });

  it("точечные witnesses не становятся параметрами", () => {
    const intent = {
      particles: {
        witnesses: ["conversation.title", "message.content"],
        confirmation: "click",
      },
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toEqual([]);
  });

  it("creates:X подтягивает поля сущности, вычитая системные", () => {
    const intent = {
      particles: {
        entities: ["message: Message"],
        witnesses: [],
        confirmation: "form",
        effects: [{ α: "add", target: "messages" }],
      },
      creates: "Message",
    };
    const params = inferParameters(intent, ONTOLOGY);
    const names = params.map(p => p.name);
    expect(names).toContain("content");
    expect(names).not.toContain("id");
    expect(names).not.toContain("createdAt");
    expect(names).not.toContain("senderId");
  });

  it("phase:investigation + точечный witness → editable параметр с default", () => {
    const intent = {
      particles: {
        witnesses: ["message.content"],
        confirmation: "click",
      },
      phase: "investigation",
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("content");
    expect(params[0].bind).toBe("message.content");
    expect(params[0].editable).toBe(true);
  });

  it("current_X → неявный параметр X", () => {
    const intent = {
      particles: { witnesses: ["current_theme"], confirmation: "click" },
    };
    const params = inferParameters(intent, ONTOLOGY);
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("theme");
  });

  it("результат-witnesses (results, translated_text) не параметры", () => {
    const intent = {
      particles: {
        witnesses: ["query", "results"],
        confirmation: "form",
      },
    };
    const params = inferParameters(intent, ONTOLOGY);
    const names = params.map(p => p.name);
    expect(names).toContain("query");
    expect(names).not.toContain("results");
  });

  it("пропускает объектные computed witnesses", () => {
    const intent = {
      particles: {
        witnesses: [
          "title",
          { field: "bidCount", compute: "count(bids, listingId=target.id)" },
          "description",
        ],
        effects: [{ α: "add", target: "listings" }],
      },
      creates: "Listing",
    };
    const params = inferParameters(intent, { entities: { Listing: { fields: [] } } });
    const names = params.map(p => p.name);
    expect(names).toContain("title");
    expect(names).toContain("description");
    expect(names).not.toContain("bidCount");
  });

  it("массив только из computed witnesses → пустые параметры от witnesses", () => {
    const intent = {
      particles: {
        witnesses: [
          { field: "bidCount", compute: "count(bids, listingId=target.id)" },
        ],
        effects: [{ α: "replace", target: "listing.status" }],
      },
    };
    const params = inferParameters(intent, {});
    expect(params).toHaveLength(0);
  });
});

describe("inferParameters — polymorphic (v0.15)", () => {
  const polyOntology = {
    entities: {
      Task: {
        discriminator: "kind",
        variants: {
          story: { fields: { storyPoints: { type: "number", label: "Points" } } },
          bug:   { fields: { severity: { type: "enum", values: ["low", "high"] } } },
        },
        fields: {
          id: {},
          title: { type: "text", label: "Title" },
          kind: { type: "enum", values: ["story", "bug"] },
        },
      },
    },
  };

  it("creates:'Task(bug)' → params include severity, не storyPoints", () => {
    const intent = {
      creates: "Task(bug)",
      particles: { entities: ["Task"], effects: [{ α: "add", target: "tasks" }], witnesses: [] },
    };
    const params = inferParameters(intent, polyOntology);
    const names = params.map(p => p.name);
    expect(names).toContain("title");
    expect(names).toContain("severity");
    expect(names).not.toContain("storyPoints");
  });

  it("creates:'Task(story)' → hidden discriminator param с default", () => {
    const intent = {
      creates: "Task(story)",
      particles: { entities: ["Task"], effects: [{ α: "add", target: "tasks" }], witnesses: [] },
    };
    const params = inferParameters(intent, polyOntology);
    const kindParam = params.find(p => p.name === "kind");
    expect(kindParam).toBeDefined();
    expect(kindParam.hidden).toBe(true);
    expect(kindParam.default).toBe("story");
  });

  it("creates:'Task' (нет variant) → только shared fields, без variant-fields", () => {
    const intent = {
      creates: "Task",
      particles: { entities: ["Task"], effects: [{ α: "add", target: "tasks" }], witnesses: [] },
    };
    const params = inferParameters(intent, polyOntology);
    const names = params.map(p => p.name);
    expect(names).toContain("title");
    expect(names).not.toContain("severity");
    expect(names).not.toContain("storyPoints");
  });
});
