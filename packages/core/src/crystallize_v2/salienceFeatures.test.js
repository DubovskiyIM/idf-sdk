import { describe, it, expect } from "vitest";
import { extractSalienceFeatures, FEATURE_KEYS } from "./salienceFeatures.js";

const baseCtx = {
  projection: { id: "booking_detail", mainEntity: "Booking" },
  ONTOLOGY: {
    entities: {
      Booking: {
        fields: { status: {}, customerId: {} },
        ownerField: "customerId",
      },
    },
  },
  intentUsage: { confirm_booking: 5, cancel_booking: 3, create_review: 1 },
};

describe("extractSalienceFeatures — FEATURE_KEYS contract", () => {
  it("возвращает объект с точно FEATURE_KEYS ключами", () => {
    const f = extractSalienceFeatures({ id: "any" }, baseCtx);
    expect(Object.keys(f).sort()).toEqual([...FEATURE_KEYS].sort());
  });

  it("все значения числа", () => {
    const f = extractSalienceFeatures({ id: "any" }, baseCtx);
    for (const v of Object.values(f)) {
      expect(typeof v).toBe("number");
    }
  });
});

describe("extractSalienceFeatures — explicit salience", () => {
  it("число нормализуется в [0..1] делением на 100", () => {
    const f = extractSalienceFeatures({ id: "x", salience: 80 }, baseCtx);
    expect(f.explicitNumber).toBeCloseTo(0.8);
    expect(f.explicitTier).toBe(0);
  });

  it("строка 'primary' → explicitTier=1.0", () => {
    const f = extractSalienceFeatures({ id: "x", salience: "primary" }, baseCtx);
    expect(f.explicitTier).toBe(1.0);
    expect(f.explicitNumber).toBe(0);
  });

  it("строка 'secondary' → 0.5", () => {
    const f = extractSalienceFeatures({ id: "x", salience: "secondary" }, baseCtx);
    expect(f.explicitTier).toBe(0.5);
  });

  it("строка 'tertiary' → 0.2", () => {
    const f = extractSalienceFeatures({ id: "x", salience: "tertiary" }, baseCtx);
    expect(f.explicitTier).toBe(0.2);
  });

  it("строка 'utility' → 0.05", () => {
    const f = extractSalienceFeatures({ id: "x", salience: "utility" }, baseCtx);
    expect(f.explicitTier).toBe(0.05);
  });

  it("неизвестная строка → explicitTier=0", () => {
    const f = extractSalienceFeatures({ id: "x", salience: "critical" }, baseCtx);
    expect(f.explicitTier).toBe(0);
    expect(f.explicitNumber).toBe(0);
  });

  it("число > 100 зажимается до 1", () => {
    const f = extractSalienceFeatures({ id: "x", salience: 150 }, baseCtx);
    expect(f.explicitNumber).toBe(1);
  });

  it("число 0 → explicitNumber=0", () => {
    const f = extractSalienceFeatures({ id: "x", salience: 0 }, baseCtx);
    expect(f.explicitNumber).toBe(0);
  });
});

describe("extractSalienceFeatures — tier1CanonicalEdit", () => {
  it("edit_booking → tier1CanonicalEdit=1", () => {
    const f = extractSalienceFeatures(
      { id: "edit_booking", particles: { effects: [{ α: "replace", target: "Booking" }] } },
      baseCtx
    );
    expect(f.tier1CanonicalEdit).toBe(1);
  });

  it("update_booking → tier1CanonicalEdit=1", () => {
    const f = extractSalienceFeatures({ id: "update_booking" }, baseCtx);
    expect(f.tier1CanonicalEdit).toBe(1);
  });

  it("edit_review → tier1CanonicalEdit=0 (другая entity)", () => {
    const f = extractSalienceFeatures({ id: "edit_review" }, baseCtx);
    expect(f.tier1CanonicalEdit).toBe(0);
  });

  it("edit_booking_partial → tier1CanonicalEdit=0 (нет точного match)", () => {
    const f = extractSalienceFeatures({ id: "edit_booking_partial" }, baseCtx);
    expect(f.tier1CanonicalEdit).toBe(0);
  });
});

describe("extractSalienceFeatures — tier2EditLike", () => {
  it("rename_something → tier2EditLike=1", () => {
    const f = extractSalienceFeatures({ id: "rename_booking" }, baseCtx);
    expect(f.tier2EditLike).toBe(1);
  });

  it("create_booking → tier2EditLike=0", () => {
    const f = extractSalienceFeatures({ id: "create_booking" }, baseCtx);
    expect(f.tier2EditLike).toBe(0);
  });
});

describe("extractSalienceFeatures — tier3Promotion", () => {
  it("confirm_booking → tier3Promotion=1", () => {
    const f = extractSalienceFeatures(
      { id: "confirm_booking", particles: { effects: [{ α: "replace", target: "Booking.status" }] } },
      baseCtx
    );
    expect(f.tier3Promotion).toBe(1);
    expect(f.phaseTransition).toBe(1);
  });

  it("submit_report → tier3Promotion=1", () => {
    const f = extractSalienceFeatures({ id: "submit_report" }, baseCtx);
    expect(f.tier3Promotion).toBe(1);
  });

  it("approve_booking → tier3Promotion=1", () => {
    const f = extractSalienceFeatures({ id: "approve_booking" }, baseCtx);
    expect(f.tier3Promotion).toBe(1);
  });

  it("cancel_booking → tier3Promotion=0", () => {
    const f = extractSalienceFeatures({ id: "cancel_booking" }, baseCtx);
    expect(f.tier3Promotion).toBe(0);
  });
});

describe("extractSalienceFeatures — phaseTransition", () => {
  it("replace на .status → phaseTransition=1", () => {
    const intent = {
      id: "confirm_booking",
      particles: { effects: [{ α: "replace", target: "Booking.status" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.phaseTransition).toBe(1);
  });

  it("replace на .phase → phaseTransition=1", () => {
    const intent = {
      id: "advance_phase",
      particles: { effects: [{ α: "replace", target: "Booking.phase" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.phaseTransition).toBe(1);
  });

  it("replace на .title → phaseTransition=0", () => {
    const intent = {
      id: "edit_booking",
      particles: { effects: [{ α: "replace", target: "Booking.title" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.phaseTransition).toBe(0);
  });
});

describe("extractSalienceFeatures — irreversibilityHigh", () => {
  it("effect с __irr.point=high → irreversibilityHigh=1", () => {
    const intent = {
      id: "confirm_deal",
      particles: {
        effects: [
          {
            α: "replace",
            target: "Deal.status",
            context: { __irr: { point: "high", at: "now" } },
          },
        ],
      },
    };
    const dealCtx = {
      ...baseCtx,
      projection: { id: "deal_detail", mainEntity: "Deal" },
      ONTOLOGY: { entities: { Deal: { fields: { status: {} } } } },
    };
    const f = extractSalienceFeatures(intent, dealCtx);
    expect(f.irreversibilityHigh).toBe(1);
  });

  it("__irr.point=low → irreversibilityHigh=0", () => {
    const intent = {
      id: "do_something",
      particles: {
        effects: [{ α: "replace", target: "Booking.status", context: { __irr: { point: "low" } } }],
      },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.irreversibilityHigh).toBe(0);
  });
});

describe("extractSalienceFeatures — removeMain", () => {
  it("α:remove на mainEntity → removeMain=1", () => {
    const intent = {
      id: "delete_booking",
      particles: { effects: [{ α: "remove", target: "Booking" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.removeMain).toBe(1);
  });

  it("α:remove на другой entity → removeMain=0", () => {
    const intent = {
      id: "remove_review",
      particles: { effects: [{ α: "remove", target: "Review" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.removeMain).toBe(0);
  });
});

describe("extractSalienceFeatures — readOnly", () => {
  it("нет effects → readOnly=1", () => {
    const intent = { id: "view_booking", particles: { effects: [] } };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.readOnly).toBe(1);
  });

  it("есть хотя бы один effect → readOnly=0", () => {
    const intent = {
      id: "edit_booking",
      particles: { effects: [{ α: "replace", target: "Booking.status" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.readOnly).toBe(0);
  });
});

describe("extractSalienceFeatures — domainFrequency", () => {
  it("normalize по total intentUsage", () => {
    const intent = {
      id: "confirm_booking",
      particles: { effects: [{ α: "replace", target: "Booking.status" }] },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    // total = 5+3+1 = 9, confirm=5
    expect(f.domainFrequency).toBeCloseTo(5 / 9);
  });

  it("intent отсутствующий в intentUsage → 0", () => {
    const intent = { id: "unknown_intent" };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.domainFrequency).toBe(0);
  });

  it("пустой intentUsage → domainFrequency=0", () => {
    const ctx = { ...baseCtx, intentUsage: {} };
    const intent = { id: "some_intent" };
    const f = extractSalienceFeatures(intent, ctx);
    expect(f.domainFrequency).toBe(0);
  });
});

describe("extractSalienceFeatures — tier4ReplaceMain", () => {
  it("replace на mainEntity без conditions → tier4ReplaceMain=1", () => {
    const intent = {
      id: "edit_booking",
      particles: {
        effects: [{ α: "replace", target: "Booking" }],
        conditions: [],
      },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.tier4ReplaceMain).toBe(1);
  });

  it("replace с conditions → tier4ReplaceMain=0", () => {
    const intent = {
      id: "cancel_booking",
      particles: {
        effects: [{ α: "replace", target: "Booking.status" }],
        conditions: [{ field: "Booking.status", op: "in", value: ["pending"] }],
      },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.tier4ReplaceMain).toBe(0);
  });
});

describe("extractSalienceFeatures — creatorMain", () => {
  it("intent.creates === mainEntity → creatorMain=1", () => {
    const intent = { id: "create_booking", creates: "Booking" };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.creatorMain).toBe(1);
  });

  it("intent.creates другой entity → creatorMain=0", () => {
    const intent = { id: "create_review", creates: "Review" };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.creatorMain).toBe(0);
  });
});

describe("extractSalienceFeatures — ownershipMatch", () => {
  it("particles.entities содержит mainEntity → ownershipMatch=1", () => {
    const intent = {
      id: "cancel_booking",
      particles: {
        entities: ["Booking"],
        effects: [{ α: "replace", target: "Booking.status" }],
      },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    expect(f.ownershipMatch).toBe(1);
  });

  it("particles.entities в alias-формате 'Booking: customerId' → ownershipMatch=1", () => {
    const intent = {
      id: "cancel_booking",
      particles: {
        entities: ["booking: customerId"],
        effects: [{ α: "replace", target: "Booking.status" }],
      },
    };
    const f = extractSalienceFeatures(intent, baseCtx);
    // stripAlias даёт "customerId", что является ownerField
    expect(f.ownershipMatch).toBe(1);
  });

  it("нет ownerField в ONTOLOGY → ownershipMatch=0", () => {
    const ctx = {
      ...baseCtx,
      ONTOLOGY: { entities: { Booking: { fields: { status: {} } } } },
    };
    const intent = {
      id: "cancel_booking",
      particles: {
        entities: ["Booking"],
        effects: [{ α: "replace", target: "Booking.status" }],
      },
    };
    const f = extractSalienceFeatures(intent, ctx);
    expect(f.ownershipMatch).toBe(0);
  });
});

describe("extractSalienceFeatures — case-insensitive target matching", () => {
  it("target 'order.status' (lowercase) матчит mainEntity 'Order'", () => {
    const ctx = {
      projection: { id: "order_detail", mainEntity: "Order" },
      ONTOLOGY: { entities: { Order: { fields: { status: {} } } } },
      intentUsage: {},
    };
    const intent = {
      id: "confirm_order",
      particles: { effects: [{ α: "replace", target: "order.status" }] },
    };
    const f = extractSalienceFeatures(intent, ctx);
    expect(f.phaseTransition).toBe(1);
  });

  it("entities с пробелами 'order: Order' → правильный stripAlias", () => {
    const ctx = {
      projection: { id: "order_detail", mainEntity: "Order" },
      ONTOLOGY: {
        entities: { Order: { fields: { status: {}, ownerId: {} }, ownerField: "ownerId" } },
      },
      intentUsage: {},
    };
    const intent = {
      id: "edit_order",
      particles: {
        entities: ["order: Order"],
        effects: [{ α: "replace", target: "order.title" }],
      },
    };
    const f = extractSalienceFeatures(intent, ctx);
    // stripAlias("order: Order") → "Order", matches mainEntity
    expect(f.ownershipMatch).toBe(1);
  });
});
