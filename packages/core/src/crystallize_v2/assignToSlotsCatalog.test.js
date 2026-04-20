import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

const INTENTS = {
  create_direct_chat: {
    name: "Личный чат",
    particles: {
      entities: ["conversation: Conversation", "user: User"],
      witnesses: [],
      confirmation: "click",
      conditions: [],
      effects: [{ α: "add", target: "conversations" }],
    },
    creates: "Conversation",
  },
  create_group: {
    name: "Групповой чат",
    particles: {
      entities: ["conversation: Conversation"],
      witnesses: [],
      confirmation: "form",
      conditions: [],
      effects: [{ α: "add", target: "conversations" }],
    },
    creates: "Conversation",
    parameters: [{ name: "title", type: "text", required: true }],
  },
  delete_conversation: {
    name: "Удалить беседу",
    particles: {
      entities: ["conversation: Conversation"],
      witnesses: ["conversation.title"],
      confirmation: "click",
      conditions: [],
      effects: [{ α: "replace", target: "conversation.deletedFor" }],
    },
    irreversibility: "high",
  },
  search_conversations: {
    name: "Поиск",
    particles: {
      entities: [],
      witnesses: ["query", "results"],
      confirmation: "form",
      conditions: [],
      effects: [],
    },
    parameters: [{ name: "query", type: "text", required: true }],
  },
};

const conversationList = {
  name: "Беседы",
  kind: "catalog",
  entities: ["Conversation", "Participant"],
  mainEntity: "Conversation",
};

const ONTOLOGY = {
  entities: {
    Conversation: { fields: ["id", "title", "createdAt"] },
    Participant: { fields: ["id", "muted"] },
    User: { fields: ["id", "name"] },
  },
};

describe("assignToSlotsCatalog", () => {
  it("creates главной сущности с одним текстовым параметром (create_group) → hero", () => {
    // M4 Step A: простые creator-интенты с одним text-параметром
    // перехватываются heroCreate control-архетипом и становятся
    // inline-создателем над списком, а не fab+formModal.
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    const heroIds = (slots.hero || []).map(s => s.intentId);
    expect(heroIds).toContain("create_group");
    const hero = slots.hero.find(s => s.intentId === "create_group");
    expect(hero.type).toBe("heroCreate");
    expect(hero.paramName).toBe("title");
  });

  it("creator без параметров с extra entity (create_direct_chat) → customCapture entityPicker в toolbar", () => {
    // M3.5b: create_direct_chat creates Conversation + entity User
    // (вне route scope conversation_list). customCapture.entityPicker
    // перехватывает такие intents и кладёт их в toolbar с trigger+overlay.
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    const toolbarIds = slots.toolbar.map(s => s.trigger?.intentId || s.intentId);
    expect(toolbarIds).toContain("create_direct_chat");
    const overlayTypes = slots.overlay.map(o => o.type);
    expect(overlayTypes).toContain("customCapture");
    const picker = slots.overlay.find(o => o.widgetId === "entityPicker");
    expect(picker).toBeDefined();
    expect(picker.targetEntity).toBe("User");
    expect(picker.targetCollection).toBe("users");
    expect(picker.targetAlias).toBe("user");
  });

  it("per-item intent с irreversibility → item.intents с overlay", () => {
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    expect(slots.body.item).toBeDefined();
    const del = slots.body.item.intents.find(i => i.intentId === "delete_conversation");
    expect(del).toBeDefined();
    expect(del.opens).toBe("overlay");
  });

  it("search-утилита (query+results) → inlineSearch в toolbar", () => {
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    const searchCtrl = slots.toolbar.find(t => t.intentId === "search_conversations");
    expect(searchCtrl).toBeDefined();
    expect(searchCtrl.type).toBe("inlineSearch");
  });

  it("body — list с source, соответствующим главной сущности", () => {
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    expect(slots.body.type).toBe("list");
    expect(slots.body.source).toBe("conversations");
  });

  it("нет composer (только feed имеет composer)", () => {
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    expect(slots.composer).toBeUndefined();
  });

  it("возвращает все слоты", () => {
    const slots = assignToSlotsCatalog(INTENTS, conversationList, ONTOLOGY);
    expect(slots).toHaveProperty("header");
    expect(slots).toHaveProperty("toolbar");
    expect(slots).toHaveProperty("body");
    expect(slots).toHaveProperty("context");
    expect(slots).toHaveProperty("fab");
    expect(slots).toHaveProperty("overlay");
  });

  describe("heroCreate guard по shape", () => {
    const healthOntology = {
      entities: {
        HealthRecord: { fields: { id: {}, recordDate: { type: "date" }, weight: {} } },
      },
    };
    const healthProjection = {
      kind: "catalog",
      mainEntity: "HealthRecord",
      witnesses: ["recordDate", "weight"],
      sort: "-recordDate",
    };
    const healthIntents = {
      log_health: {
        name: "Записать состояние",
        creates: "HealthRecord",
        particles: {
          entities: ["HealthRecord"],
          witnesses: ["weight"],
          confirmation: "form",
          conditions: [],
          effects: [{ α: "add", target: "healthRecords" }],
        },
        parameters: [{ name: "weight", type: "number", required: true }],
      },
    };

    it("shape=timeline — hero не создаётся, creator переходит в toolbar", () => {
      const slots = assignToSlotsCatalog(healthIntents, healthProjection, healthOntology, null, "timeline");
      expect(slots.hero).toHaveLength(0);
      const toolbarIds = slots.toolbar.map(b => b?.intentId || b?.trigger?.intentId);
      expect(toolbarIds).toContain("log_health");
    });

    it("shape=directory — hero заблокирован", () => {
      const slots = assignToSlotsCatalog(healthIntents, healthProjection, healthOntology, null, "directory");
      expect(slots.hero).toHaveLength(0);
    });

    it("shape=default — hero заполнен как раньше", () => {
      const slots = assignToSlotsCatalog(healthIntents, healthProjection, healthOntology, null, "default");
      expect(slots.hero.length).toBeGreaterThan(0);
    });

    it("shape пишется в body.shape для не-default", () => {
      const slots = assignToSlotsCatalog(healthIntents, healthProjection, healthOntology, null, "timeline");
      expect(slots.body.shape).toBe("timeline");
    });

    it("shape=default — body.shape отсутствует", () => {
      const slots = assignToSlotsCatalog(healthIntents, healthProjection, healthOntology, null, "default");
      expect(slots.body.shape).toBeUndefined();
    });
  });

  describe("projection.emptyState (UI-gap #8)", () => {
    const emptyINTENTS = {
      add_task: {
        name: "Создать задачу",
        creates: "Task",
        particles: { effects: [{ α: "add", target: "tasks" }] },
      },
    };
    const emptyONTOLOGY = {
      entities: {
        Task: { fields: { id: { type: "text" }, title: { type: "text" } } },
      },
    };

    it("без projection.emptyState → default text empty ('Пусто')", () => {
      const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
      const slots = assignToSlotsCatalog(emptyINTENTS, projection, emptyONTOLOGY);
      expect(slots.body.empty).toEqual({ type: "text", content: "Пусто", style: "muted" });
    });

    it("projection.emptyState = { title, hint } → body.empty as emptyState node", () => {
      const projection = {
        kind: "catalog", mainEntity: "Task", entities: ["Task"],
        emptyState: {
          title: "У вас пока нет заданий",
          hint: "Ваши открытые задания появятся здесь",
        },
      };
      const slots = assignToSlotsCatalog(emptyINTENTS, projection, emptyONTOLOGY);
      expect(slots.body.empty.type).toBe("emptyState");
      expect(slots.body.empty.title).toBe("У вас пока нет заданий");
      expect(slots.body.empty.hint).toBe("Ваши открытые задания появятся здесь");
    });

    it("emptyState с cta и illustration → все поля в body.empty", () => {
      const projection = {
        kind: "catalog", mainEntity: "Task", entities: ["Task"],
        emptyState: {
          illustration: "/empty-tasks.svg",
          title: "Нет задач",
          cta: { label: "Создать", intentId: "add_task" },
        },
      };
      const slots = assignToSlotsCatalog(emptyINTENTS, projection, emptyONTOLOGY);
      expect(slots.body.empty.illustration).toBe("/empty-tasks.svg");
      expect(slots.body.empty.cta).toEqual({ label: "Создать", intentId: "add_task" });
    });
  });
});
