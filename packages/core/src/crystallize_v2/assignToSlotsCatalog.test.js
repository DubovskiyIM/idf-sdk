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
  // Default-flip (#439): tier-routing default-on. Эти legacy тесты документируют
  // heroCreate-path и customCapture flow — opt-out чтобы tier-routing не
  // переехал create_direct_chat в hero раньше heroCreate-path для create_group.
  features: { salienceDrivenRouting: false },
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

  describe("projection.witnesses[] strict (backlog §8.3 / Workzilla P0-3)", () => {
    const workzillaOntology = {
      entities: {
        Task: {
          fields: {
            id: { type: "text" },
            title: { type: "text" },
            description: { type: "textarea" },
            budget: { type: "number", fieldRole: "money" },
            deadline: { type: "datetime" },
            status: { type: "enum", values: ["draft", "published", "in_progress"] },
          },
        },
        Listing: {
          fields: {
            id: { type: "text" },
            title: { type: "text" },
            price: { type: "number" },
            photos: { type: "multiImage" },
          },
        },
      },
    };
    const dummyIntents = {};

    it("witnesses без heroImage → column с 4 node'ами (title/budget/deadline/status)", () => {
      const projection = {
        kind: "catalog",
        mainEntity: "Task",
        entities: ["Task"],
        witnesses: ["title", "budget", "deadline", "status"],
      };
      const slots = assignToSlotsCatalog(dummyIntents, projection, workzillaOntology);
      expect(slots.body.item.children).toHaveLength(1);
      const column = slots.body.item.children[0];
      expect(column.type).toBe("column");
      expect(column.children).toHaveLength(4);
      expect(column.children[0]).toMatchObject({ type: "text", bind: "title", style: "heading" });
      expect(column.children[1]).toMatchObject({ type: "text", bind: "budget", format: "currency" });
      expect(column.children[2]).toMatchObject({ type: "timer", bind: "deadline" });
      expect(column.children[3]).toMatchObject({ type: "badge", bind: "status" });
    });

    it("witnesses с heroImage (photos) → avatar слева, остальные справа в column", () => {
      const projection = {
        kind: "catalog",
        mainEntity: "Listing",
        entities: ["Listing"],
        witnesses: ["photos", "title", "price"],
      };
      const slots = assignToSlotsCatalog(dummyIntents, projection, workzillaOntology);
      const row = slots.body.item.children[0];
      expect(row.type).toBe("row");
      expect(row.children[0]).toMatchObject({ type: "avatar", bind: "photos" });
      expect(row.children[1].type).toBe("column");
      const rightChildren = row.children[1].children;
      // avatar-witness исключается из правой колонки, остаётся title+price
      expect(rightChildren).toHaveLength(2);
      expect(rightChildren[0]).toMatchObject({ bind: "title", style: "heading" });
      expect(rightChildren[1]).toMatchObject({ bind: "price", format: "currency" });
    });

    it("witnesses пустой → fallback на legacy avatar+title+subtitle", () => {
      const projection = {
        kind: "catalog",
        mainEntity: "Task",
        entities: ["Task"],
        witnesses: [],
      };
      const slots = assignToSlotsCatalog(dummyIntents, projection, workzillaOntology);
      const row = slots.body.item.children[0];
      expect(row.type).toBe("row");
      expect(row.children[0]).toMatchObject({ type: "avatar", bind: "avatar" });
    });

    it("witnesses не задан → legacy fallback", () => {
      const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
      const slots = assignToSlotsCatalog(dummyIntents, projection, workzillaOntology);
      const row = slots.body.item.children[0];
      expect(row.type).toBe("row");
      expect(row.children[0]).toMatchObject({ type: "avatar", bind: "avatar" });
    });

    it("layout=grid + witnesses → grid-path (cardSpec), НЕ witness-children", () => {
      // Для grid мы не заменяем children — работает buildCardSpec + grid-card-layout
      // pattern. Чтобы не сломать существующий grid-card-layout.
      const projection = {
        kind: "catalog",
        mainEntity: "Listing",
        entities: ["Listing"],
        witnesses: ["photos", "title", "price"],
        layout: "grid",
      };
      const slots = assignToSlotsCatalog(dummyIntents, projection, workzillaOntology);
      // Legacy avatar-children остаются (для back-compat, хотя grid renderer
      // использует cardSpec).
      const row = slots.body.item.children[0];
      expect(row.children[0]).toMatchObject({ type: "avatar", bind: "avatar" });
      // cardSpec заполнен из witnesses.
      expect(slots.body.cardSpec).toBeDefined();
      expect(slots.body.cardSpec.image).toEqual({ bind: "photos" });
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

  describe("projection.bodyOverride — authored body node", () => {
    const bodyOntology = {
      entities: {
        Catalog: { fields: { name: { type: "text" }, type: { type: "text" } } },
      },
    };

    it("bodyOverride заменяет derived body целиком", () => {
      const projection = {
        kind: "catalog", mainEntity: "Catalog", entities: ["Catalog"],
        bodyOverride: {
          type: "dataGrid",
          items: [],
          columns: [{ key: "name", label: "Name" }],
        },
      };
      const slots = assignToSlotsCatalog({}, projection, bodyOntology);
      expect(slots.body.type).toBe("dataGrid");
      expect(slots.body.columns).toEqual([{ key: "name", label: "Name" }]);
      expect(slots.body.item).toBeUndefined();
      expect(slots.body.source).toBeUndefined();
    });

    it("без bodyOverride — default list-shape", () => {
      const projection = {
        kind: "catalog", mainEntity: "Catalog", entities: ["Catalog"],
      };
      const slots = assignToSlotsCatalog({}, projection, bodyOntology);
      expect(slots.body.type).toBe("list");
      expect(slots.body.item).toBeDefined();
    });

    it("bodyOverride не мутируется shape/strategy-post-processing", () => {
      const projection = {
        kind: "catalog", mainEntity: "Catalog", entities: ["Catalog"],
        shape: "timeline",
        bodyOverride: {
          type: "dataGrid",
          items: [],
          columns: [{ key: "name" }],
        },
      };
      const slots = assignToSlotsCatalog({}, projection, bodyOntology);
      expect(slots.body.shape).toBeUndefined();
      expect(slots.body.type).toBe("dataGrid");
    });
  });
});
