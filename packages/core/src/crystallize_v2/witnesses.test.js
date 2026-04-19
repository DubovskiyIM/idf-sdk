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
