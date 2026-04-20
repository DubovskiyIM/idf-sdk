import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

// Generic feed-архетип (R11 v2: owner-scoped temporal feed). Non-messenger
// mainEntity → используется общий catalog-body-builder, а не messenger
// chat template. projection.filter / sort / layout прокидываются как есть.

const INTENTS = {
  create_insight: {
    name: "Создать инсайт",
    particles: {
      entities: ["insight: Insight"],
      witnesses: ["insight.text"],
      confirmation: "form",
      conditions: [],
      effects: [{ α: "add", target: "insights" }],
    },
    creates: "Insight",
  },
};

const ONTOLOGY = {
  entities: {
    Insight: {
      fields: ["id", "userId", "text", "createdAt"],
      ownerField: "userId",
      temporal: true,
    },
  },
};

describe("crystallizeV2 — generic feed (R11 v2 shape)", () => {
  const PROJECTIONS = {
    my_insight_feed: {
      name: "Мои инсайты",
      kind: "feed",
      mainEntity: "Insight",
      witnesses: ["text", "createdAt"],
      entities: ["Insight"],
      filter: { field: "userId", op: "=", value: "me.id" },
      sort: "-createdAt",
    },
  };

  const artifact = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "reflect").my_insight_feed;

  it("archetype feed собирается для non-Message mainEntity", () => {
    expect(artifact).toBeDefined();
    expect(artifact.archetype).toBe("feed");
  });

  it("body.source резолвит plural из mainEntity", () => {
    expect(artifact.slots.body.source).toBe("insights");
  });

  it("body.filter — structured object (R11 v2 shape сохраняется)", () => {
    expect(artifact.slots.body.filter).toEqual({
      field: "userId", op: "=", value: "me.id",
    });
  });

  it("body.sort — descending по timestampField", () => {
    expect(artifact.slots.body.sort).toBe("-createdAt");
  });

  it("body не содержит messenger-специфику (direction:bottom-up, variant:chat)", () => {
    expect(artifact.slots.body.direction).toBeUndefined();
    expect(artifact.slots.body.item?.variant).not.toBe("chat");
  });
});

describe("crystallizeV2 — messenger chat остался back-compat", () => {
  const MESSENGER_INTENTS = {
    send_message: {
      name: "Отправить",
      particles: {
        entities: ["message: Message"],
        witnesses: ["draft_text"],
        confirmation: "enter",
        conditions: [],
        effects: [{ α: "add", target: "messages" }],
      },
      creates: "Message",
    },
  };
  const MESSENGER_PROJECTIONS = {
    chat_view: {
      name: "Чат",
      kind: "feed",
      mainEntity: "Message",
      witnesses: ["content"],
      entities: ["Message"],
    },
  };
  const MESSENGER_ONTOLOGY = {
    entities: { Message: { fields: ["id", "conversationId", "senderId", "content", "createdAt"] } },
  };

  it("mainEntity=Message → messenger chat template (direction bottom-up, variant chat)", () => {
    const a = crystallizeV2(MESSENGER_INTENTS, MESSENGER_PROJECTIONS, MESSENGER_ONTOLOGY, "messenger").chat_view;
    expect(a.slots.body.source).toBe("messages");
    expect(a.slots.body.direction).toBe("bottom-up");
    expect(a.slots.body.item.variant).toBe("chat");
  });
});
