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
