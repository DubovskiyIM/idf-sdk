import { describe, it, expect } from "vitest";
import { assignToSlotsDetail } from "./assignToSlotsDetail.js";

const INTENTS = {
  update_profile: {
    name: "Обновить профиль",
    particles: {
      entities: ["user: User"],
      witnesses: ["user.name", "user.avatar"],
      confirmation: "form",
      conditions: [],
      effects: [{ α: "replace", target: "user.name" }],
    },
    parameters: [{ name: "name", type: "text", required: true }],
  },
  // delete_account в реальном мессенджере в UNSUPPORTED_INTENTS_M2 —
  // используем синтетический intent для теста irreversibility.
  reset_profile: {
    name: "Сбросить профиль",
    particles: {
      entities: ["user: User"],
      witnesses: ["user.name"],
      confirmation: "form",
      conditions: [],
      effects: [{ α: "replace", target: "user.name" }],
    },
    irreversibility: "high",
    parameters: [{ name: "confirm", type: "text", required: true }],
  },
  block_contact: {
    name: "Заблокировать",
    particles: {
      entities: ["contact: Contact"],
      witnesses: [],
      confirmation: "click",
      conditions: ["contact.status = 'accepted'"],
      effects: [{ α: "replace", target: "contact.status" }],
    },
  },
};

const userProfile = {
  name: "Профиль",
  kind: "detail",
  entities: ["User"],
  mainEntity: "User",
  idParam: "userId",
};

const ONTOLOGY = {
  entities: {
    User: { fields: ["id", "email", "name", "avatar", "status"] },
    Contact: { fields: ["id", "status"] },
  },
};

describe("assignToSlotsDetail", () => {
  it("body — column с полями главной сущности", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    expect(slots.body.type).toBe("column");
    const binds = extractBinds(slots.body);
    expect(binds).toContain("name");
    expect(binds).toContain("email");
    expect(binds).toContain("avatar");
    expect(binds).not.toContain("id");
  });

  it("intent с form → toolbar + overlay", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    const updateTrigger = slots.toolbar.find(t => t.intentId === "update_profile");
    expect(updateTrigger).toBeDefined();
    expect(slots.overlay.some(o => o.intentId === "update_profile")).toBe(true);
  });

  it("irreversibility:high → overlay confirmDialog", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    const del = slots.overlay.find(o => o.triggerIntentId === "reset_profile");
    expect(del).toBeDefined();
    expect(del.type).toBe("confirmDialog");
  });

  it("не включает intents другой сущности", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    expect(slots.toolbar.some(t => t.intentId === "block_contact")).toBe(false);
  });

  it("нет composer, пустой fab", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    expect(slots.composer).toBeUndefined();
    expect(slots.fab).toEqual([]);
  });

  it("hubSections из R8-абсорбции прокидываются в slots.hubSections", () => {
    const projection = {
      kind: "detail",
      mainEntity: "Pet",
      hubSections: [
        { projectionId: "health_list", foreignKey: "petId", entity: "HealthRecord" },
        { projectionId: "vaccination_list", foreignKey: "petId", entity: "Vaccination" },
      ],
    };
    const ontology = { entities: { Pet: { fields: { id: {}, name: {} } } } };
    const slots = assignToSlotsDetail({}, projection, ontology);
    expect(slots.hubSections).toEqual(projection.hubSections);
  });

  it("без hubSections — slots.hubSections === null (не undefined)", () => {
    const slots = assignToSlotsDetail(INTENTS, userProfile, ONTOLOGY);
    expect(slots.hubSections).toBeNull();
  });

  describe("temporal sub-entity renderAs (v0.14)", () => {
    it("child с temporality:causal-chain → section.renderAs.type === eventTimeline", () => {
      const ontology = {
        entities: {
          Payment: { fields: { id: {}, amount: { type: "number" }, userId: { type: "entityRef" } }, ownerField: "userId" },
          PaymentEvent: {
            temporality: "causal-chain",
            ownerField: "paymentId",
            fields: {
              id: {},
              paymentId: { type: "entityRef" },
              kind: { type: "enum", values: ["created", "authorized"] },
              at: { type: "datetime" },
              actor: { type: "entityRef" },
              description: { type: "text" },
            },
          },
        },
      };
      const projection = {
        kind: "detail",
        mainEntity: "Payment",
        subCollections: [
          { collection: "events", entity: "PaymentEvent", foreignKey: "paymentId" },
        ],
      };
      const slots = assignToSlotsDetail({}, projection, ontology);
      const eventsSection = slots.sections.find(s => s.id === "events");
      expect(eventsSection).toBeDefined();
      expect(eventsSection.renderAs).toEqual({
        type: "eventTimeline",
        kind: "causal-chain",
        atField: "at",
        kindField: "kind",
        actorField: "actor",
        descriptionField: "description",
      });
    });

    it("child с temporality:snapshot → section.renderAs.kind=snapshot + stateFields", () => {
      const ontology = {
        entities: {
          Position: { fields: { id: {}, ticker: { type: "text" }, userId: { type: "entityRef" } }, ownerField: "userId" },
          PositionSnapshot: {
            temporality: "snapshot",
            ownerField: "positionId",
            fields: {
              id: {},
              positionId: { type: "entityRef" },
              at: { type: "datetime" },
              quantity: { type: "number" },
              price: { type: "number", fieldRole: "money" },
            },
          },
        },
      };
      const projection = {
        kind: "detail",
        mainEntity: "Position",
        subCollections: [
          { collection: "snapshots", entity: "PositionSnapshot", foreignKey: "positionId" },
        ],
      };
      const slots = assignToSlotsDetail({}, projection, ontology);
      const s = slots.sections.find(x => x.id === "snapshots");
      expect(s.renderAs.kind).toBe("snapshot");
      expect(s.renderAs.stateFields).toEqual(["quantity", "price"]);
    });

    it("child без temporality — section.renderAs отсутствует (backward-compat)", () => {
      const ontology = {
        entities: {
          Poll: { fields: { id: {}, title: { type: "text" }, userId: { type: "entityRef" } }, ownerField: "userId" },
          TimeOption: {
            fields: {
              id: {},
              pollId: { type: "entityRef" },
              date: { type: "date" },
              startTime: { type: "text" },
            },
          },
        },
      };
      const projection = {
        kind: "detail",
        mainEntity: "Poll",
        subCollections: [
          { collection: "timeOptions", entity: "TimeOption", foreignKey: "pollId" },
        ],
      };
      const slots = assignToSlotsDetail({}, projection, ontology);
      const s = slots.sections.find(x => x.id === "timeOptions");
      expect(s.renderAs).toBeUndefined();
    });
  });

  describe("IrreversibleBadge auto-placed (backlog 3.3)", () => {
    const ontology = {
      entities: {
        Order: {
          fields: {
            id: {},
            title: { type: "text" },
            status: { type: "text" },
            customerId: { type: "entityRef" },
          },
          ownerField: "customerId",
        },
      },
    };

    it("detail проекция с intent irreversibility=high → body содержит irreversibleBadge", () => {
      const INTENTS = {
        capture_payment: {
          name: "Capture payment",
          irreversibility: "high",
          particles: {
            entities: ["order: Order"],
            witnesses: [],
            confirmation: "click",
            conditions: [],
            effects: [{ α: "replace", target: "order.status", value: "paid" }],
          },
        },
      };
      const slots = assignToSlotsDetail(
        INTENTS,
        // IB: title — presentational поле без intent → explicit includeFields override
        { kind: "detail", mainEntity: "Order", entities: ["Order"], uiSchema: { includeFields: ["title"] } },
        ontology,
      );
      const binds = extractBinds(slots.body);
      expect(binds).toContain("__irr");
    });

    it("нет irreversibility:high intent'ов → бейдж не инжектится (back-compat)", () => {
      const INTENTS = {
        edit_title: {
          name: "Edit title",
          particles: {
            entities: ["order: Order"],
            witnesses: [],
            confirmation: "form",
            conditions: [],
            effects: [{ α: "replace", target: "order.title" }],
          },
          parameters: [{ name: "title", type: "text" }],
        },
      };
      const slots = assignToSlotsDetail(
        INTENTS,
        { kind: "detail", mainEntity: "Order", entities: ["Order"] },
        ontology,
      );
      const binds = extractBinds(slots.body);
      expect(binds).not.toContain("__irr");
    });
  });

  describe("subCollection overrides (backlog 4.6 / 4.7)", () => {
    const ontology = {
      entities: {
        Task: { fields: { id: {}, title: { type: "text" } }, ownerField: "userId" },
        Response: {
          ownerField: "executorId",
          fields: {
            id: {},
            taskId: { type: "entityRef" },
            executorId: { type: "entityRef" },
            priceOffer: { type: "number", fieldRole: "money" },
            status: { type: "text" },
            createdAt: { type: "datetime" },
          },
        },
      },
    };

    it("default collection key = camelPlural(entity) когда не задан", () => {
      // Repro для invest-portfolio-ai bug: ontology authored как
      // {entity, foreignKey, title} без `collection` — section.source раньше
      // был undefined, в renderer'е ctx.world?.[undefined] = empty list.
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{ entity: "Response", foreignKey: "taskId", title: "Отклики" }],
        },
        ontology,
      );
      const s = slots.sections[0];
      expect(s.source).toBe("responses");
      expect(s.id).toBe("responses");
    });

    it("authored collection остаётся priority над default fallback", () => {
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "myCustomKey", entity: "Response", foreignKey: "taskId",
          }],
        },
        ontology,
      );
      const s = slots.sections[0];
      expect(s.source).toBe("myCustomKey");
    });

    it("camelPlural работает для irregular: Category → categories, Glass → glasses", () => {
      const onto = {
        entities: {
          Holder: { fields: { id: {} } },
          Category: { fields: { id: {}, holderId: { type: "entityRef" } } },
          Glass: { fields: { id: {}, holderId: { type: "entityRef" } } },
        },
      };
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Holder",
          subCollections: [
            { entity: "Category", foreignKey: "holderId" },
            { entity: "Glass", foreignKey: "holderId" },
          ],
        },
        onto,
      );
      expect(slots.sections.find(s => s.itemEntity === "Category").source).toBe("categories");
      expect(slots.sections.find(s => s.itemEntity === "Glass").source).toBe("glasses");
    });

    it("itemView как строка → section.itemView.bind = строка", () => {
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
            itemView: "priceOffer",
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.itemView).toEqual({ bind: "priceOffer" });
    });

    it("itemView как объект — прокидывается целиком", () => {
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
            itemView: { bind: "priceOffer", label: "executorId", secondary: "status" },
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.itemView.bind).toBe("priceOffer");
      expect(s.itemView.label).toBe("executorId");
      expect(s.itemView.secondary).toBe("status");
    });

    it("sort и where передаются на section", () => {
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
            sort: "-createdAt",
            where: { status: "active" },
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.sort).toBe("-createdAt");
      expect(s.where).toEqual({ status: "active" });
    });

    it("backlog 4.8: enum-status с withdrawn/cancelled → section.terminalStatus", () => {
      const ontologyWithTerminal = {
        entities: {
          Task: { fields: { id: {}, title: { type: "text" } } },
          Response: {
            fields: {
              id: {},
              taskId: { type: "entityRef" },
              status: {
                type: "text",
                options: ["pending", "accepted", "withdrawn", "rejected"],
              },
            },
          },
        },
      };
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
          }],
        },
        ontologyWithTerminal,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.terminalStatus).toEqual({
        field: "status",
        values: ["withdrawn", "rejected"],
      });
      // §6.7: по умолчанию terminal items скрыты, toggle-label выставлен.
      expect(s.hideTerminal).toBe(true);
      expect(s.toggleTerminalLabel).toBe("Показать все");
    });

    it("§6.7: subDef.hideTerminal:false отключает скрытие (author override)", () => {
      const ontology = {
        entities: {
          Task: { fields: { id: {}, title: { type: "text" } } },
          Response: {
            fields: {
              id: {},
              taskId: { type: "entityRef" },
              status: { type: "text", options: ["pending", "accepted", "withdrawn"] },
            },
          },
        },
      };
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
            hideTerminal: false,
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.terminalStatus).toBeDefined();
      expect(s.hideTerminal).toBe(false);
      expect(s.toggleTerminalLabel).toBeUndefined();
    });

    it("§6.7: subDef.toggleTerminalLabel кастомизирует подпись", () => {
      const ontology = {
        entities: {
          Task: { fields: { id: {}, title: { type: "text" } } },
          Response: {
            fields: {
              id: {},
              taskId: { type: "entityRef" },
              status: { type: "text", options: ["pending", "cancelled"] },
            },
          },
        },
      };
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
            toggleTerminalLabel: "Показать отменённые",
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.toggleTerminalLabel).toBe("Показать отменённые");
    });

    it("4.8 без terminal values → section.terminalStatus undefined", () => {
      const ontologyClean = {
        entities: {
          Task: { fields: { id: {}, title: { type: "text" } } },
          Response: {
            fields: {
              id: {},
              taskId: { type: "entityRef" },
              status: { type: "text", options: ["pending", "accepted"] },
            },
          },
        },
      };
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
          }],
        },
        ontologyClean,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.terminalStatus).toBeUndefined();
    });

    it("backlog 4.5: addControl матчится при FK даже без явного parentEntity в entities", () => {
      const ontologyWithFk = {
        entities: {
          Task: { fields: { id: {}, title: { type: "text" } }, ownerField: "userId" },
          Response: {
            ownerField: "executorId",
            fields: {
              id: {},
              taskId: { type: "entityRef" },
              executorId: { type: "entityRef" },
              price: { type: "number" },
            },
          },
        },
      };
      const INTENTS = {
        submit_response: {
          name: "Откликнуться",
          creates: "Response",
          particles: {
            // Только response-сущность, без Task (FK сам декларирует связь)
            entities: ["response: Response"],
            witnesses: [],
            confirmation: "form",
            conditions: [],
            effects: [{ α: "add", target: "responses" }],
          },
          parameters: [{ name: "price", type: "number" }],
        },
      };
      const slots = assignToSlotsDetail(
        INTENTS,
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
          }],
        },
        ontologyWithFk,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.addControl).toBeDefined();
      expect(s.addControl.intentId).toBe("submit_response");
    });

    it("без override itemView выводится SDK-инференцией (back-compat)", () => {
      const slots = assignToSlotsDetail(
        {},
        {
          kind: "detail", mainEntity: "Task",
          subCollections: [{
            collection: "responses", entity: "Response", foreignKey: "taskId",
          }],
        },
        ontology,
      );
      const s = slots.sections.find(x => x.id === "responses");
      expect(s.itemView).toBeDefined();
      expect(s.sort).toBeUndefined();
      expect(s.where).toBeUndefined();
    });
  });
});

function extractBinds(node) {
  const binds = [];
  const walk = (n) => {
    if (!n) return;
    if (n.bind) binds.push(n.bind);
    if (n.children) n.children.forEach(walk);
    if (n.item) walk(n.item);
    // InfoSection/PriceBlock/StatBar: fields[].bind или fields[].name
    if (Array.isArray(n.fields)) {
      n.fields.forEach(f => { if (f.bind) binds.push(f.bind); if (f.name) binds.push(f.name); });
    }
  };
  walk(node);
  return binds;
}

describe("ownershipConditionFor — multi-owner (§3.2)", () => {
  const mkProjection = () => ({
    name: "Deal",
    kind: "detail",
    entities: ["Deal"],
    mainEntity: "Deal",
    idParam: "dealId",
  });
  const mkIntents = (intentOverrides = {}) => ({
    edit_deal: {
      name: "Редактировать Deal",
      particles: {
        entities: ["deal: Deal"],
        witnesses: ["deal.status"],
        confirmation: "form",
        conditions: [],
        effects: [{ α: "replace", target: "deal.status" }],
      },
      parameters: [{ name: "status", type: "text", required: true }],
      ...intentOverrides,
    },
  });

  it("legacy single ownerField → 'field === viewer.id'", () => {
    const ontology = {
      entities: { Deal: { ownerField: "clientId", fields: ["id", "clientId", "status"] } },
    };
    const slots = assignToSlotsDetail(mkIntents(), mkProjection(), ontology);
    const btn = slots.toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("clientId === viewer.id");
  });

  it("multi-owner owners[] → OR expression обёрнут в скобки", () => {
    const ontology = {
      entities: {
        Deal: {
          owners: ["customerId", "executorId"],
          fields: ["id", "customerId", "executorId", "status"],
        },
      },
    };
    const slots = assignToSlotsDetail(mkIntents(), mkProjection(), ontology);
    const btn = slots.toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });

  it("permittedFor string → только указанное поле", () => {
    const ontology = {
      entities: {
        Deal: {
          owners: ["customerId", "executorId"],
          fields: ["id", "customerId", "executorId", "status"],
        },
      },
    };
    const slots = assignToSlotsDetail(
      mkIntents({ permittedFor: "executorId" }),
      mkProjection(),
      ontology,
    );
    const btn = slots.toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("executorId === viewer.id");
  });

  it("permittedFor array → OR пересечения", () => {
    const ontology = {
      entities: {
        Deal: {
          owners: ["customerId", "executorId", "observerId"],
          fields: ["id", "customerId", "executorId", "observerId", "status"],
        },
      },
    };
    const slots = assignToSlotsDetail(
      mkIntents({ permittedFor: ["customerId", "executorId"] }),
      mkProjection(),
      ontology,
    );
    const btn = slots.toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });
});

describe("projection.toolbar whitelist (author-override)", () => {
  // Phase-transition без params + не-high irreversibility → обычно уходит
  // в primaryCTA. С whitelist должен остаться в toolbar.
  const phaseTransitionProjection = (overrides = {}) => ({
    name: "Task",
    kind: "detail",
    entities: ["Task"],
    mainEntity: "Task",
    idParam: "taskId",
    ...overrides,
  });
  const phaseTransitionIntents = {
    publish_task: {
      name: "Опубликовать",
      icon: "📢",
      particles: {
        entities: ["task: Task"],
        witnesses: [],
        confirmation: "click",
        conditions: ["task.status = 'draft'"],
        effects: [{ α: "replace", target: "task.status", value: "published" }],
      },
    },
  };
  const phaseOntology = {
    entities: {
      Task: {
        ownerField: "customerId",
        fields: ["id", "customerId", "title", "status"],
      },
    },
  };

  it("без whitelist: phase-transition → primaryCTA", () => {
    const slots = assignToSlotsDetail(
      phaseTransitionIntents,
      phaseTransitionProjection(),
      phaseOntology,
    );
    expect(slots.primaryCTA.some(b => b.intentId === "publish_task")).toBe(true);
    expect(slots.toolbar.some(b => b.intentId === "publish_task")).toBe(false);
  });

  it("projection.toolbar whitelist → phase-transition остаётся в toolbar", () => {
    const slots = assignToSlotsDetail(
      phaseTransitionIntents,
      phaseTransitionProjection({ toolbar: ["publish_task"] }),
      phaseOntology,
    );
    expect(slots.toolbar.some(b => b.intentId === "publish_task")).toBe(true);
    expect(slots.primaryCTA.some(b => b.intentId === "publish_task")).toBe(false);
  });

  it("whitelist сохраняет ownership-condition", () => {
    const slots = assignToSlotsDetail(
      phaseTransitionIntents,
      phaseTransitionProjection({ toolbar: ["publish_task"] }),
      phaseOntology,
    );
    const btn = slots.toolbar.find(b => b.intentId === "publish_task");
    expect(btn?.condition).toBe("customerId === viewer.id");
  });

  it("whitelist не аффектит intents не из списка", () => {
    const intents = {
      ...phaseTransitionIntents,
      close_task: {
        name: "Закрыть",
        icon: "🗑",
        particles: {
          entities: ["task: Task"],
          witnesses: [],
          confirmation: "click",
          conditions: ["task.status = 'published'"],
          effects: [{ α: "replace", target: "task.status", value: "closed" }],
        },
      },
    };
    const slots = assignToSlotsDetail(
      intents,
      phaseTransitionProjection({ toolbar: ["publish_task"] }),
      phaseOntology,
    );
    expect(slots.toolbar.some(b => b.intentId === "publish_task")).toBe(true);
    expect(slots.primaryCTA.some(b => b.intentId === "close_task")).toBe(true);
  });
});

describe("field.primitive declarative hint", () => {
  // Use-case: Gravitino Table.columns (type:"json") рендерится как
  // SchemaEditor primitive вместо text-fallback. Gen-механизм для любого
  // custom primitive на field-уровне (map → mapPrimitive, chart → и т.п.).

  it("field.primitive 'schemaEditor' перекрывает type-heuristic json", () => {
    const ont = {
      entities: {
        Table: {
          fields: {
            name: { type: "string", role: "primary-title" },
            columns: { type: "json", primitive: "schemaEditor" },
          },
        },
      },
    };
    const proj = {
      name: "Table",
      kind: "detail",
      mainEntity: "Table",
      entities: ["Table"],
      idParam: "tableId",
      witnesses: ["name", "columns"],
    };
    const slots = assignToSlotsDetail({}, proj, ont);
    const bodyStr = JSON.stringify(slots.body);
    expect(bodyStr).toContain('"type":"schemaEditor"');
    expect(bodyStr).toContain('"bind":"columns"');
  });

  it("field без primitive-hint идёт через type-heuristic (backward compat)", () => {
    const ont = {
      entities: {
        Task: {
          fields: {
            title: { type: "string", role: "primary-title" },
            note: { type: "textarea" },
          },
        },
      },
    };
    const proj = {
      name: "Task",
      kind: "detail",
      mainEntity: "Task",
      entities: ["Task"],
      idParam: "taskId",
      witnesses: ["title", "note"],
    };
    const slots = assignToSlotsDetail({}, proj, ont);
    const bodyStr = JSON.stringify(slots.body);
    // textarea → text atom (через existing heuristic), не 'schemaEditor'
    expect(bodyStr).not.toContain("schemaEditor");
    expect(bodyStr).toContain('"bind":"note"');
  });

  it("field.primitive произвольная строка → atom.type = primitive name", () => {
    // Extensibility: any named primitive (map, chart, etc) работает через
    // тот же механизм. Renderer PRIMITIVES map resolves name.
    const ont = {
      entities: {
        Location: {
          fields: {
            coords: { type: "coordinate", primitive: "map" },
          },
        },
      },
    };
    const proj = {
      name: "Location",
      kind: "detail",
      mainEntity: "Location",
      entities: ["Location"],
      idParam: "locId",
      witnesses: ["coords"],
    };
    const slots = assignToSlotsDetail({}, proj, ont);
    expect(JSON.stringify(slots.body)).toContain('"type":"map"');
  });
});

describe("IB filter в assignToSlotsDetail", () => {
  function extractFieldNames(body) {
    const names = [];
    function traverse(node) {
      if (!node || typeof node !== "object") return;
      if (node.bind && typeof node.bind === "string") names.push(node.bind);
      for (const child of node.children || []) traverse(child);
      for (const item of node.items || []) traverse(item);
      // infoSection хранит поля в node.fields[].bind
      for (const f of node.fields || []) {
        if (f.bind && typeof f.bind === "string") names.push(f.bind);
      }
    }
    traverse(body);
    return names;
  }

  it("excludes Booking.internalNote from detail body when no accessible intent reads/writes it", () => {
    const ONTOLOGY = {
      entities: { Booking: { fields: {
        id: { canonicalType: "id" },
        status: { canonicalType: "string" },
        customerId: { canonicalType: "id" },
        internalNote: { canonicalType: "string" }
      }, ownerField: "customerId" } },
      roles: { customer: { base: "owner" } }
    };
    const INTENTS = {
      cancel_booking: { particles: {
        effects: [{ α: "replace", target: "Booking.status" }],
        conditions: [{ field: "Booking.status", op: "in", value: ["pending"] }]
      } }
    };
    const projection = { id: "booking_detail", archetype: "detail", mainEntity: "Booking" };
    const result = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, "customer", {});
    const fieldNames = extractFieldNames(result.body);
    expect(fieldNames).not.toContain("internalNote");
    expect(fieldNames).toContain("status");
  });
});
