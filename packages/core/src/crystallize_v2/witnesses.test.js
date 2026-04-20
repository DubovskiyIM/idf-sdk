import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";
import { deriveProjections } from "./deriveProjections.js";

describe("artifact.witnesses — pattern-bank findings", () => {
  it("writes pattern-bank witnesses with rule-based reliability", () => {
    const INTENTS = {
      add_position: { creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Portfolio: { fields: { name: { type: "text" } } },
        Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
      },
    };
    const PROJECTIONS = {
      portfolio_detail: { kind: "detail", mainEntity: "Portfolio" },
    };
    const { portfolio_detail } = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY);
    const patternWitnesses = portfolio_detail.witnesses.filter(w => w.basis === "pattern-bank");
    expect(patternWitnesses.length).toBeGreaterThan(0);
    const sub = patternWitnesses.find(w => w.pattern === "subcollections");
    expect(sub).toBeDefined();
    expect(sub.reliability).toBe("rule-based");
    expect(sub.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "sub-entity-exists", ok: true }),
    ]));
  });
});

describe("proj.derivedBy — crystallize-rule witnesses на уровне deriveProjections", () => {
  it("R1: catalog witness несёт ruleId, input.creators, rationale", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = {
      entities: { Listing: { fields: { title: { type: "text" } } } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.listing_list).toBeDefined();
    const r1 = projections.listing_list.derivedBy.find(w => w.ruleId === "R1");
    expect(r1).toBeDefined();
    expect(r1.basis).toBe("crystallize-rule");
    expect(r1.reliability).toBe("rule-based");
    expect(r1.input.entity).toBe("Listing");
    expect(r1.input.creators).toEqual(["add_listing"]);
    expect(r1.output.kind).toBe("catalog");
    expect(r1.rationale).toContain("creators(Listing)");
  });

  it("R2: feed override несёт input.foreignKey и идёт вторым после R1", () => {
    const INTENTS = {
      send_message: {
        creates: "Message",
        particles: {
          effects: [{ α: "create", target: "message" }],
          confirmation: "enter",
        },
      },
    };
    const ONTOLOGY = {
      entities: {
        Conversation: { fields: { title: { type: "text" } } },
        Message: {
          fields: {
            conversationId: { type: "entityRef" },
            text: { type: "text" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.message_list.kind).toBe("feed");
    const trail = projections.message_list.derivedBy;
    expect(trail.map(w => w.ruleId)).toEqual(["R1", "R2"]);
    const r2 = trail[1];
    expect(r2.input.foreignKey).toBe("conversationId");
    expect(r2.input.references).toBe("Conversation");
    expect(r2.output.kind).toBe("feed");
    expect(r2.output.idParam).toBe("conversationId");
  });

  it("R3: detail witness несёт mutators count и rationale", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
      publish_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
      cancel_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
    };
    const ONTOLOGY = {
      entities: { Listing: { fields: { title: { type: "text" }, status: { type: "text" } } } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.listing_detail).toBeDefined();
    const r3 = projections.listing_detail.derivedBy.find(w => w.ruleId === "R3");
    expect(r3).toBeDefined();
    // Все 4 intent'а touch listing через effect.target → mutators.
    // analyzeIntents собирает и creators, и effect-touchers в mutators.
    expect(r3.input.count).toBe(4);
    expect(r3.input.mutators).toEqual(expect.arrayContaining(["add_listing", "edit_listing", "publish_listing", "cancel_listing"]));
    expect(r3.output.kind).toBe("detail");
    expect(r3.rationale).toContain(">");
  });

  it("R3: не срабатывает при |mutators| ≤ 1 → проекции detail нет и witness нет", () => {
    // Единственный intent, один effect → mutators.Category = [add_category], count=1.
    const INTENTS = {
      add_category: { creates: "Category", particles: { effects: [{ α: "create", target: "category" }] } },
    };
    const ONTOLOGY = { entities: { Category: { fields: { name: { type: "text" } } } } };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.category_detail).toBeUndefined();
  });

  it("R7: my_*_list witness ссылается на sourceCatalog и ownerField", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Listing: {
          ownerField: "sellerId",
          fields: { sellerId: { type: "entityRef" }, title: { type: "text" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.my_listing_list).toBeDefined();
    const r7 = projections.my_listing_list.derivedBy.find(w => w.ruleId === "R7");
    expect(r7).toBeDefined();
    expect(r7.input.ownerField).toBe("sellerId");
    expect(r7.input.sourceCatalog).toBe("listing_list");
    expect(r7.output.filter).toEqual({ field: "sellerId", op: "=", value: "me.id" });
  });

  it("R7b: my_*_list с disjunction filter для multi-ownerField массива", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: {
          ownerField: ["customerId", "executorId"],
          fields: {
            customerId: { type: "entityRef" },
            executorId: { type: "entityRef" },
            amount: { type: "number" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.my_deal_list).toBeDefined();
    const r7b = projections.my_deal_list.derivedBy.find(w => w.ruleId === "R7b");
    expect(r7b).toBeDefined();
    expect(r7b.input.ownerFields).toEqual(["customerId", "executorId"]);
    expect(r7b.input.count).toBe(2);
    expect(r7b.output.filter).toEqual({
      kind: "disjunction",
      fields: ["customerId", "executorId"],
      op: "=",
      value: "me.id",
    });
    expect(r7b.rationale).toContain("OR");

    // Не должно быть R7 (strict mutual exclusion)
    const r7 = projections.my_deal_list.derivedBy.find(w => w.ruleId === "R7");
    expect(r7).toBeUndefined();

    // Проекция имеет disjunction filter, не single
    expect(projections.my_deal_list.filter.kind).toBe("disjunction");
  });

  it("R7b: читает entityDef.owners (preference) с fallback к ownerField", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
    };
    // Новый API — owners без ownerField.
    const ONTOLOGY_OWNERS = {
      entities: {
        Deal: {
          owners: ["customerId", "executorId"],
          fields: {
            customerId: { type: "entityRef" },
            executorId: { type: "entityRef" },
          },
        },
      },
    };
    const projOwners = deriveProjections(INTENTS, ONTOLOGY_OWNERS);
    expect(projOwners.my_deal_list).toBeDefined();
    expect(projOwners.my_deal_list.filter.kind).toBe("disjunction");
    expect(projOwners.my_deal_list.filter.fields).toEqual(["customerId", "executorId"]);

    // Legacy API — ownerField. Должно работать идентично.
    const ONTOLOGY_LEGACY = {
      entities: {
        Deal: {
          ownerField: ["customerId", "executorId"],
          fields: {
            customerId: { type: "entityRef" },
            executorId: { type: "entityRef" },
          },
        },
      },
    };
    const projLegacy = deriveProjections(INTENTS, ONTOLOGY_LEGACY);
    expect(projLegacy.my_deal_list.filter).toEqual(projOwners.my_deal_list.filter);

    // Оба одновременно (idf/freelance workaround) — owners побеждает.
    const ONTOLOGY_BOTH = {
      entities: {
        Deal: {
          owners: ["customerId", "executorId"],
          ownerField: ["ignoredA", "ignoredB"],  // отличается от owners
          fields: {
            customerId: { type: "entityRef" },
            executorId: { type: "entityRef" },
          },
        },
      },
    };
    const projBoth = deriveProjections(INTENTS, ONTOLOGY_BOTH);
    expect(projBoth.my_deal_list.filter.fields).toEqual(["customerId", "executorId"]);
  });

  it("R7b: ownerField single-element array → R7 path (не R7b)", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Listing: {
          ownerField: ["sellerId"],  // array с 1 элементом
          fields: { sellerId: { type: "entityRef" }, title: { type: "text" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    // Array с length=1 не должен триггерить R7b (требование ≥2)
    expect(projections.my_listing_list).toBeUndefined();
  });

  it("R7: side-effect created entity (без creates) — R3 detail fallback, R1-independent", () => {
    const INTENTS = {
      accept_response: {
        particles: { effects: [
          { α: "replace", target: "response.status" },
          { α: "create",  target: "deal" },
        ]},
      },
      edit_deal:  { particles: { effects: [{ α: "replace", target: "deal.amount" }] } },
      close_deal: { particles: { effects: [{ α: "replace", target: "deal.status" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: {
          ownerField: "customerId",
          fields: { customerId: { type: "entityRef" }, amount: { type: "number" }, status: { type: "text" } },
        },
        Response: { fields: { status: { type: "text" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.deal_list).toBeUndefined();  // R1 не сработал (нет creates:"Deal")
    expect(projections.deal_detail).toBeDefined();   // R3 сработал (≥2 mutators)
    expect(projections.my_deal_list).toBeDefined();  // R7 — теперь через R3 fallback
    const r7 = projections.my_deal_list.derivedBy.find(w => w.ruleId === "R7");
    expect(r7.input.sourceBase).toBe("deal_detail");
    expect(r7.input.sourceCatalog).toBe("deal_detail");  // backward compat
  });

  it("R7b: side-effect entity с multi-owner — тоже через R3 fallback", () => {
    const INTENTS = {
      accept_response: {
        particles: { effects: [
          { α: "replace", target: "response.status" },
          { α: "create",  target: "deal" },
        ]},
      },
      edit_deal:  { particles: { effects: [{ α: "replace", target: "deal.amount" }] } },
      close_deal: { particles: { effects: [{ α: "replace", target: "deal.status" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: {
          ownerField: ["customerId", "executorId"],
          fields: {
            customerId: { type: "entityRef" }, executorId: { type: "entityRef" },
            amount: { type: "number" }, status: { type: "text" },
          },
        },
        Response: { fields: { status: { type: "text" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.deal_list).toBeUndefined();
    expect(projections.my_deal_list).toBeDefined();
    const r7b = projections.my_deal_list.derivedBy.find(w => w.ruleId === "R7b");
    expect(r7b.input.sourceBase).toBe("deal_detail");
    expect(projections.my_deal_list.filter.kind).toBe("disjunction");
  });

  it("R7: base R1 catalog приоритет над R3 detail когда оба существуют", () => {
    const INTENTS = {
      add_listing:  { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Listing: {
          ownerField: "sellerId",
          fields: { sellerId: { type: "entityRef" }, title: { type: "text" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.listing_list).toBeDefined();
    expect(projections.listing_detail).toBeDefined();
    const r7 = projections.my_listing_list.derivedBy.find(w => w.ruleId === "R7");
    expect(r7.input.sourceBase).toBe("listing_list");  // catalog предпочтён
  });

  it("R7: без base (ни catalog, ни detail) — не срабатывает", () => {
    const INTENTS = {};
    const ONTOLOGY = {
      entities: {
        Listing: {
          ownerField: "sellerId",
          fields: { sellerId: { type: "entityRef" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    expect(projections.my_listing_list).toBeUndefined();
  });

  it("R3b: singleton detail с ownerField → my_*_detail без idParam с owner-фильтром", () => {
    const INTENTS = {
      create_wallet:  { creates: "Wallet", particles: { effects: [{ α: "create", target: "wallet" }] } },
      topup_wallet:   { particles: { effects: [{ α: "replace", target: "wallet.balance" }] } },
      reserve_wallet: { particles: { effects: [{ α: "replace", target: "wallet.reserved" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Wallet: {
          ownerField: "userId",
          singleton: true,
          fields: { userId: { type: "entityRef" }, balance: { type: "number" }, reserved: { type: "number" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.my_wallet_detail).toBeDefined();
    expect(projections.wallet_detail).toBeDefined();
    expect(projections.my_wallet_detail.singleton).toBe(true);
    expect(projections.my_wallet_detail.filter).toEqual({ field: "userId", op: "=", value: "me.id" });

    const r3b = projections.my_wallet_detail.derivedBy.find(w => w.ruleId === "R3b");
    expect(r3b).toBeDefined();
    expect(r3b.input.ownerField).toBe("userId");
    expect(r3b.input.sourceDetail).toBe("wallet_detail");
    expect(r3b.output.singleton).toBe(true);
  });

  it("R3b: не срабатывает без singleton:true флага", () => {
    const INTENTS = {
      create_w: { creates: "Wallet", particles: { effects: [{ α: "create", target: "wallet" }] } },
      edit_w:   { particles: { effects: [{ α: "replace", target: "wallet.balance" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Wallet: {
          ownerField: "userId",
          // singleton: true — отсутствует
          fields: { userId: { type: "entityRef" }, balance: { type: "number" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.wallet_detail).toBeDefined();
    expect(projections.my_wallet_detail).toBeUndefined();
  });

  it("R3b: не срабатывает когда ownerField — массив (требует single owner)", () => {
    const INTENTS = {
      create_d: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
      edit_d:   { particles: { effects: [{ α: "replace", target: "deal.amount" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: {
          ownerField: ["customerId", "executorId"],
          singleton: true,
          fields: { customerId: { type: "entityRef" }, executorId: { type: "entityRef" }, amount: { type: "number" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.my_deal_detail).toBeUndefined();
  });

  it("R3b: не срабатывает если base detail (R3) не был выведен (mutator=1)", () => {
    const INTENTS = {
      create_solo: { creates: "Solo", particles: { effects: [{ α: "create", target: "solo" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Solo: {
          ownerField: "userId",
          singleton: true,
          fields: { userId: { type: "entityRef" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.solo_detail).toBeUndefined();
    expect(projections.my_solo_detail).toBeUndefined();
  });

  it("R7b: three+ ownerFields — все в disjunction", () => {
    const INTENTS = {
      add_thing: { creates: "Thing", particles: { effects: [{ α: "create", target: "thing" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Thing: {
          ownerField: ["userId", "collaboratorId", "observerId"],
          fields: {
            userId: { type: "entityRef" },
            collaboratorId: { type: "entityRef" },
            observerId: { type: "entityRef" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    const r7b = projections.my_thing_list.derivedBy.find(w => w.ruleId === "R7b");
    expect(r7b.input.count).toBe(3);
    expect(r7b.output.filter.fields.length).toBe(3);
  });

  it("R1b: read-only catalog для entity.kind === 'reference' без creators", () => {
    const INTENTS = {
      add_position: {
        creates: "Position",
        particles: {
          effects: [{ α: "create", target: "position" }],
          entities: ["mainEntity:Position", "referenced:Asset"],
        },
      },
    };
    const ONTOLOGY = {
      entities: {
        Asset: { kind: "reference", fields: { ticker: { type: "text" } } },
        Position: { fields: { assetId: { type: "entityRef" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.asset_list).toBeDefined();
    expect(projections.asset_list.kind).toBe("catalog");
    expect(projections.asset_list.readonly).toBe(true);
    const r1b = projections.asset_list.derivedBy.find(w => w.ruleId === "R1b");
    expect(r1b).toBeDefined();
    expect(r1b.input.source).toBe("kind:reference");
    expect(r1b.input.creators).toEqual([]);
    expect(r1b.output.readonly).toBe(true);
    expect(r1b.rationale).toContain("reference");
  });

  it("R1b: read-only catalog для entity referenced через foreignKey без kind:reference", () => {
    const INTENTS = {
      add_address: { creates: "Address", particles: { effects: [{ α: "create", target: "address" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Zone: { fields: { name: { type: "text" } } },
        Address: { fields: { zoneId: { type: "entityRef" }, street: { type: "text" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.zone_list).toBeDefined();
    expect(projections.zone_list.readonly).toBe(true);
    const r1b = projections.zone_list.derivedBy.find(w => w.ruleId === "R1b");
    expect(r1b.input.source).toBe("referenced-by");
    expect(r1b.input.referencedBy).toEqual(["Address.zoneId"]);
  });

  it("R1b: не срабатывает для assignment-entities (m2m)", () => {
    const INTENTS = {
      add_position: { creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Position: { fields: { assignmentId: { type: "entityRef" } } },
        Assignment: { kind: "assignment", fields: { userId: { type: "entityRef" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.assignment_list).toBeUndefined();
  });

  it("R1b: не срабатывает для isolated entity (нет ни references, ни kind:reference)", () => {
    const INTENTS = {
      add_task: { creates: "Task", particles: { effects: [{ α: "create", target: "task" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Task: { fields: { title: { type: "text" } } },
        Isolated: { fields: { name: { type: "text" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.isolated_list).toBeUndefined();
  });

  it("R9: ontology.compositions обогащает catalog — entities + compositions + witness", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: { fields: { amount: { type: "number" }, taskId: { type: "entityRef" }, customerId: { type: "entityRef" } } },
        Task: { fields: { title: { type: "text" } } },
        User: { fields: { name: { type: "text" } } },
      },
      compositions: {
        Deal: [
          { entity: "Task", as: "task",     via: "taskId" },
          { entity: "User", as: "customer", via: "customerId", mode: "one" },
        ],
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.deal_list).toBeDefined();
    expect(projections.deal_list.compositions).toEqual([
      { entity: "Task", as: "task",     via: "taskId",     mode: "one" },
      { entity: "User", as: "customer", via: "customerId", mode: "one" },
    ]);
    expect(projections.deal_list.entities).toEqual(expect.arrayContaining(["Deal", "Task", "User"]));
    const r9 = projections.deal_list.derivedBy.find(w => w.ruleId === "R9");
    expect(r9).toBeDefined();
    expect(r9.input.joins.length).toBe(2);
    expect(r9.input.source).toBe("compositions");
  });

  it("R9: нет compositions — проекция не обогащается, witness не пишется", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
    };
    const ONTOLOGY = {
      entities: { Deal: { fields: { amount: { type: "number" } } } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.deal_list).toBeDefined();
    expect(projections.deal_list.compositions).toBeUndefined();
    const r9 = projections.deal_list.derivedBy.find(w => w.ruleId === "R9");
    expect(r9).toBeUndefined();
  });

  it("R9: incomplete composition entries игнорируются", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
    };
    const ONTOLOGY = {
      entities: { Deal: { fields: { amount: { type: "number" } } }, Task: { fields: {} } },
      compositions: {
        Deal: [
          { entity: "Task", as: "task", via: "taskId" },
          { entity: "User" },  // incomplete — отсутствуют as, via
          { via: "someId" },   // incomplete — отсутствуют entity, as
        ],
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    // Должен обогатиться только валидной записью Task
    expect(projections.deal_list.compositions).toEqual([
      { entity: "Task", as: "task", via: "taskId", mode: "one" },
    ]);
  });

  it("R9: обогащает и catalog, и detail для одного mainEntity", () => {
    const INTENTS = {
      add_deal: { creates: "Deal", particles: { effects: [{ α: "create", target: "deal" }] } },
      edit_deal: { particles: { effects: [{ α: "replace", target: "deal.amount" }] } },
      close_deal: { particles: { effects: [{ α: "replace", target: "deal.status" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Deal: { fields: { amount: { type: "number" }, status: { type: "text" }, taskId: { type: "entityRef" } } },
        Task: { fields: { title: { type: "text" } } },
      },
      compositions: {
        Deal: [{ entity: "Task", as: "task", via: "taskId" }],
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.deal_list.compositions).toBeDefined();
    expect(projections.deal_detail.compositions).toBeDefined();
    expect(projections.deal_detail.compositions[0].as).toBe("task");
  });

  it("R11: temporal entity → <entity>_feed с sort:\"-<timestampField>\"", () => {
    const INTENTS = {
      add_insight: {
        creates: "Insight",
        particles: { effects: [{ α: "create", target: "insight" }] },
      },
    };
    const ONTOLOGY = {
      entities: {
        Insight: {
          temporal: true,  // R11 trigger
          fields: {
            title: { type: "text" },
            createdAt: { type: "datetime" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.insight_list).toBeDefined();  // R1 всё ещё сработал
    expect(projections.insight_feed).toBeDefined();  // R11 добавил feed
    expect(projections.insight_feed.kind).toBe("feed");
    expect(projections.insight_feed.sort).toBe("-createdAt");

    const r11 = projections.insight_feed.derivedBy.find(w => w.ruleId === "R11");
    expect(r11).toBeDefined();
    expect(r11.input.timestampField).toBe("createdAt");
    expect(r11.input.sourceBase).toBe("insight_list");
  });

  it("R11: explicit timestampField override", () => {
    const INTENTS = {
      add_event: { creates: "Event", particles: { effects: [{ α: "create", target: "event" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Event: {
          temporal: true,
          timestampField: "occurredAt",
          fields: { name: { type: "text" }, occurredAt: { type: "datetime" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.event_feed.sort).toBe("-occurredAt");
    const r11 = projections.event_feed.derivedBy.find(w => w.ruleId === "R11");
    expect(r11.input.timestampField).toBe("occurredAt");
  });

  it("R11: не срабатывает без temporal:true флага", () => {
    const INTENTS = {
      add_thing: { creates: "Thing", particles: { effects: [{ α: "create", target: "thing" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Thing: { fields: { name: { type: "text" } } },  // no temporal
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.thing_list).toBeDefined();
    expect(projections.thing_feed).toBeUndefined();
  });

  it("R11 v2: owner-scoped temporal feed → дополнительно my_<entity>_feed с filter", () => {
    const INTENTS = {
      add_insight: { creates: "Insight", particles: { effects: [{ α: "create", target: "insight" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Insight: {
          temporal: true,
          ownerField: "userId",
          fields: {
            userId: { type: "entityRef" },
            title: { type: "text" },
            createdAt: { type: "datetime" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.insight_feed).toBeDefined();
    expect(projections.insight_feed.filter).toBeUndefined();

    expect(projections.my_insight_feed).toBeDefined();
    expect(projections.my_insight_feed.kind).toBe("feed");
    expect(projections.my_insight_feed.sort).toBe("-createdAt");
    expect(projections.my_insight_feed.filter).toEqual({
      field: "userId", op: "=", value: "me.id",
    });

    const r11 = projections.my_insight_feed.derivedBy.find(w => w.ruleId === "R11");
    expect(r11.input.ownerScoped).toBe(true);
    expect(r11.input.ownerField).toBe("userId");
    expect(r11.rationale).toContain("owner-filter");
  });

  it("R11 v2: array ownerField (multi) → только public feed (R11 v2 single-string)", () => {
    const INTENTS = {
      add_shared: { creates: "Shared", particles: { effects: [{ α: "create", target: "shared" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Shared: {
          temporal: true,
          ownerField: ["ownerA", "ownerB"],
          fields: { ownerA: { type: "entityRef" }, ownerB: { type: "entityRef" }, createdAt: { type: "datetime" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.shared_feed).toBeDefined();
    expect(projections.my_shared_feed).toBeUndefined();
  });

  it("R11: fallback на R3 detail если нет R1 catalog", () => {
    const INTENTS = {
      edit_note: { particles: { effects: [{ α: "replace", target: "note.body" }] } },
      pin_note:  { particles: { effects: [{ α: "replace", target: "note.pinned" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Note: {
          temporal: true,
          fields: { body: { type: "text" }, pinned: { type: "boolean" }, createdAt: { type: "datetime" } },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.note_list).toBeUndefined();
    expect(projections.note_detail).toBeDefined();  // R3 (2 mutators)
    expect(projections.note_feed).toBeDefined();  // R11 через R3 fallback
    const r11 = projections.note_feed.derivedBy.find(w => w.ruleId === "R11");
    expect(r11.input.sourceBase).toBe("note_detail");
  });

  it("R10: scoped catalog выведен из role.scope m2m-via", () => {
    const INTENTS = {
      view_client: { particles: { entities: ["viewer:User"], witnesses: ["name", "email"] } },
    };
    const ONTOLOGY = {
      entities: {
        User: { fields: { name: { type: "text" }, email: { type: "text" } } },
        Assignment: {
          kind: "assignment",
          fields: {
            advisorId: { type: "entityRef" },
            clientId: { type: "entityRef" },
            status: { type: "text" },
          },
        },
      },
      roles: {
        advisor: {
          base: "agent",
          scope: {
            User: {
              via: "assignments",
              viewerField: "advisorId",
              joinField: "clientId",
              localField: "id",
              statusField: "status",
              statusAllowed: ["active"],
            },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.advisor_user_list).toBeDefined();
    expect(projections.advisor_user_list.kind).toBe("catalog");
    expect(projections.advisor_user_list.readonly).toBe(true);
    expect(projections.advisor_user_list.filter.kind).toBe("m2m-via");
    expect(projections.advisor_user_list.filter.via).toBe("assignments");
    expect(projections.advisor_user_list.filter.joinField).toBe("clientId");

    const r10 = projections.advisor_user_list.derivedBy.find(w => w.ruleId === "R10");
    expect(r10).toBeDefined();
    expect(r10.input.role).toBe("advisor");
    expect(r10.input.entity).toBe("User");
    expect(r10.output.readonly).toBe(true);
  });

  it("R10: несколько entities в scope → несколько scoped catalog'ов", () => {
    const INTENTS = {};
    const ONTOLOGY = {
      entities: {
        User: { fields: { name: { type: "text" } } },
        Portfolio: { fields: { userId: { type: "entityRef" }, name: { type: "text" } } },
        Assignment: {
          kind: "assignment",
          fields: { advisorId: { type: "entityRef" }, clientId: { type: "entityRef" } },
        },
      },
      roles: {
        advisor: {
          scope: {
            User:      { via: "assignments", viewerField: "advisorId", joinField: "clientId", localField: "id" },
            Portfolio: { via: "assignments", viewerField: "advisorId", joinField: "clientId", localField: "userId" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.advisor_user_list).toBeDefined();
    expect(projections.advisor_portfolio_list).toBeDefined();
    expect(projections.advisor_portfolio_list.filter.localField).toBe("userId");
  });

  it("R10: incomplete scope-spec игнорируется", () => {
    const INTENTS = {};
    const ONTOLOGY = {
      entities: { User: { fields: { name: { type: "text" } } } },
      roles: {
        admin: { scope: { User: { via: "assignments" } } },  // incomplete
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.admin_user_list).toBeUndefined();
  });

  it("R10: роль без scope не триггерит правило", () => {
    const INTENTS = {};
    const ONTOLOGY = {
      entities: { User: { fields: { name: { type: "text" } } } },
      roles: { viewer: { base: "viewer" } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(Object.keys(projections).filter(k => k.startsWith("viewer_"))).toEqual([]);
  });

  it("R1: имеет приоритет над R1b — если есть creators, R1 обычный catalog без readonly", () => {
    const INTENTS = {
      add_asset: { creates: "Asset", particles: { effects: [{ α: "create", target: "asset" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Asset: { kind: "reference", fields: { ticker: { type: "text" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.asset_list).toBeDefined();
    expect(projections.asset_list.readonly).toBeUndefined();
    const r1 = projections.asset_list.derivedBy.find(w => w.ruleId === "R1");
    expect(r1).toBeDefined();
    const r1b = projections.asset_list.derivedBy.find(w => w.ruleId === "R1b");
    expect(r1b).toBeUndefined();
  });
});

describe("artifact.witnesses — crystallize-rule проброшен через crystallizeV2", () => {
  it("derivedBy из proj.listing_list попадает в artifact.witnesses первым", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = {
      entities: { Listing: { fields: { title: { type: "text" } } } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test-domain");
    const listingList = artifacts.listing_list;
    expect(listingList).toBeDefined();

    const crystallizeRules = listingList.witnesses.filter(w => w.basis === "crystallize-rule");
    expect(crystallizeRules.length).toBeGreaterThanOrEqual(1);
    expect(crystallizeRules[0].ruleId).toBe("R1");

    // crystallize-rule идут первыми — до pattern-bank, polymorphic и прочего
    const firstNonRule = listingList.witnesses.findIndex(w => w.basis !== "crystallize-rule");
    if (firstNonRule !== -1) {
      const ruleCount = listingList.witnesses.slice(0, firstNonRule).length;
      expect(ruleCount).toBe(crystallizeRules.length);
    }
  });

  it("R4: subCollection witness на parent-detail ссылается на child entity и FK", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
      publish_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
      place_bid: { creates: "Bid", particles: { effects: [{ α: "create", target: "bid" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Listing: { fields: { title: { type: "text" }, status: { type: "text" } } },
        Bid: {
          fields: {
            listingId: { type: "entityRef" },
            amount: { type: "number" },
          },
        },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    expect(projections.listing_detail).toBeDefined();
    const r4 = projections.listing_detail.derivedBy.find(w => w.ruleId === "R4");
    expect(r4).toBeDefined();
    expect(r4.input.parentEntity).toBe("Listing");
    expect(r4.input.childEntity).toBe("Bid");
    expect(r4.input.foreignKey).toBe("listingId");
    expect(r4.output.subCollection).toBe("bids");
    expect(r4.output.addable).toBe(true);
  });

  it("R6: field-union witness содержит contributingIntents и fields", () => {
    const INTENTS = {
      add_listing: {
        creates: "Listing",
        particles: {
          effects: [{ α: "create", target: "listing" }],
          witnesses: ["title", "price"],
        },
      },
      edit_listing: {
        particles: {
          effects: [{ α: "replace", target: "listing.description" }],
          entities: ["mainEntity:Listing"],
          witnesses: ["description", "price"],
        },
      },
    };
    const ONTOLOGY = {
      entities: { Listing: { fields: { title: { type: "text" }, price: { type: "number" }, description: { type: "text" } } } },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    const r6 = projections.listing_list.derivedBy.find(w => w.ruleId === "R6");
    expect(r6).toBeDefined();
    // union sorted: description, price, title
    expect(r6.output.witnesses).toEqual(["description", "price", "title"]);
    expect(r6.output.count).toBe(3);
    expect(r6.input.contributingIntents).toEqual(expect.arrayContaining(["add_listing", "edit_listing"]));
  });

  it("R6: пустые witnesses — witness не пишется", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = { entities: { Listing: { fields: { title: { type: "text" } } } } };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    const r6 = projections.listing_list.derivedBy.find(w => w.ruleId === "R6");
    expect(r6).toBeUndefined();
  });
});

describe("absorbHubChildren — R8 witnesses", () => {
  it("R8 witness на hub-detail содержит absorbedChildren и threshold", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
      edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
      publish_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
      place_bid: { creates: "Bid", particles: { effects: [{ α: "create", target: "bid" }] } },
      add_review: { creates: "Review", particles: { effects: [{ α: "create", target: "review" }] } },
    };
    const ONTOLOGY = {
      entities: {
        Listing: { fields: { title: { type: "text" }, status: { type: "text" } } },
        Bid: { fields: { listingId: { type: "entityRef" }, amount: { type: "number" } } },
        Review: { fields: { listingId: { type: "entityRef" }, rating: { type: "number" } } },
      },
    };
    const projections = deriveProjections(INTENTS, ONTOLOGY);

    // Кристаллизация запустит absorbHubChildren — artifact.witnesses должен содержать R8.
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY);
    const listingDetail = artifacts.listing_detail;
    const r8Hub = listingDetail.witnesses.find(w => w.ruleId === "R8" && w.input.parentDetail === "listing_detail");
    expect(r8Hub).toBeDefined();
    expect(r8Hub.input.absorbedChildren).toEqual(expect.arrayContaining(["bid_list", "review_list"]));
    expect(r8Hub.input.threshold).toBe(2);
    expect(r8Hub.output.hubSections.length).toBe(2);

    const bidList = artifacts.bid_list;
    const r8Child = bidList.witnesses.find(w => w.ruleId === "R8" && w.input.childCatalog === "bid_list");
    expect(r8Child).toBeDefined();
    expect(r8Child.output.absorbedBy).toBe("listing_detail");
    expect(r8Child.input.foreignKey).toBe("listingId");
  });
});

describe("artifact.witnesses — crystallize-rule проброшен через crystallizeV2 (edge cases)", () => {
  it("authored-проекции (без derivedBy) не ломают artifact.witnesses", () => {
    const INTENTS = {
      add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }] } },
    };
    const ONTOLOGY = { entities: { Listing: { fields: { title: { type: "text" } } } } };
    const PROJECTIONS = {
      listing_authored: { kind: "catalog", mainEntity: "Listing" },
    };
    const artifacts = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY);
    expect(artifacts.listing_authored).toBeDefined();
    expect(Array.isArray(artifacts.listing_authored.witnesses)).toBe(true);
    const rules = artifacts.listing_authored.witnesses.filter(w => w.basis === "crystallize-rule");
    expect(rules.length).toBe(0);
  });
});
