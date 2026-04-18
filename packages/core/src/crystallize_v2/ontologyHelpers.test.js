import { describe, it, expect } from "vitest";
import {
  normalizeField,
  getEntityFields,
  canWrite,
  canRead,
  mapOntologyTypeToControl,
  inferFieldRole,
} from "./ontologyHelpers.js";

describe("normalizeField", () => {
  it("строка → объект с эвристикой типа", () => {
    expect(normalizeField("name")).toEqual({ name: "name", type: "text" });
    expect(normalizeField("email")).toEqual({ name: "email", type: "email" });
    expect(normalizeField("createdAt")).toEqual({ name: "createdAt", type: "datetime" });
    expect(normalizeField("avatar")).toEqual({ name: "avatar", type: "image" });
    expect(normalizeField("phone")).toEqual({ name: "phone", type: "tel" });
  });

  it("строка id → type: id", () => {
    expect(normalizeField("id")).toEqual({ name: "id", type: "id" });
    expect(normalizeField("userId")).toEqual({ name: "userId", type: "id" });
  });

  it("content/description → textarea", () => {
    expect(normalizeField("content").type).toBe("textarea");
    expect(normalizeField("description").type).toBe("textarea");
    expect(normalizeField("statusMessage").type).toBe("textarea");
  });

  it("объект + fieldName → объект с name", () => {
    const r = normalizeField({ type: "text", required: true }, "title");
    expect(r).toEqual({ name: "title", type: "text", required: true });
  });

  it("объект с read/write", () => {
    const r = normalizeField({ type: "email", read: ["*"], write: ["self"] }, "email");
    expect(r.read).toEqual(["*"]);
    expect(r.write).toEqual(["self"]);
  });
});

describe("getEntityFields", () => {
  it("массив строк → нормализованные объекты", () => {
    const entity = { fields: ["id", "name", "avatar"] };
    const fields = getEntityFields(entity);
    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({ name: "id", type: "id" });
    expect(fields[1]).toEqual({ name: "name", type: "text" });
    expect(fields[2]).toEqual({ name: "avatar", type: "image" });
  });

  it("объектный формат → массив с полной метадатой", () => {
    const entity = {
      fields: {
        id: { type: "id" },
        name: { type: "text", required: true, write: ["self"] },
        bio: { type: "textarea", read: ["*"] },
      },
    };
    const fields = getEntityFields(entity);
    expect(fields).toHaveLength(3);
    const byName = Object.fromEntries(fields.map(f => [f.name, f]));
    expect(byName.name.required).toBe(true);
    expect(byName.name.write).toEqual(["self"]);
    expect(byName.bio.read).toEqual(["*"]);
  });

  it("нет fields → пустой массив", () => {
    expect(getEntityFields({})).toEqual([]);
    expect(getEntityFields(null)).toEqual([]);
  });
});

describe("canWrite / canRead", () => {
  it("write: [self] разрешает self, запрещает другим", () => {
    expect(canWrite({ write: ["self"] }, "self")).toBe(true);
    expect(canWrite({ write: ["self"] }, "contact")).toBe(false);
    expect(canWrite({ write: ["self"] }, "admin")).toBe(false);
  });

  it("write: [*] разрешает всем", () => {
    expect(canWrite({ write: ["*"] }, "anyone")).toBe(true);
    expect(canWrite({ write: ["*"] }, "self")).toBe(true);
  });

  it("нет write → nobody can write (default immutable)", () => {
    expect(canWrite({ type: "text" }, "self")).toBe(false);
    expect(canWrite({}, "anyone")).toBe(false);
  });

  it("write: [self, admin] — оба разрешены", () => {
    expect(canWrite({ write: ["self", "admin"] }, "self")).toBe(true);
    expect(canWrite({ write: ["self", "admin"] }, "admin")).toBe(true);
    expect(canWrite({ write: ["self", "admin"] }, "guest")).toBe(false);
  });

  it("нет read → readable by default (public)", () => {
    expect(canRead({ type: "text" }, "self")).toBe(true);
    expect(canRead({}, "anyone")).toBe(true);
  });

  it("read: [self] — только self", () => {
    expect(canRead({ read: ["self"] }, "self")).toBe(true);
    expect(canRead({ read: ["self"] }, "contact")).toBe(false);
  });

  it("read: [*] — все", () => {
    expect(canRead({ read: ["*"] }, "anyone")).toBe(true);
  });
});

describe("mapOntologyTypeToControl", () => {
  it("text → text", () => {
    expect(mapOntologyTypeToControl("text")).toBe("text");
  });
  it("image → file", () => {
    expect(mapOntologyTypeToControl("image")).toBe("file");
  });
  it("enum → select", () => {
    expect(mapOntologyTypeToControl("enum")).toBe("select");
  });
  it("datetime/date → datetime", () => {
    expect(mapOntologyTypeToControl("datetime")).toBe("datetime");
    expect(mapOntologyTypeToControl("date")).toBe("datetime");
  });
  it("unknown → text", () => {
    expect(mapOntologyTypeToControl("hologram")).toBe("text");
  });
});

describe("inferFieldRole", () => {
  it("title role for name/title fields", () => {
    expect(inferFieldRole("title", { type: "text" })).toMatchObject({ role: "title" });
    expect(inferFieldRole("name", { type: "text" })).toMatchObject({ role: "title" });
  });

  it("description role for textarea description/bio/content", () => {
    expect(inferFieldRole("description", { type: "textarea" })).toMatchObject({ role: "description" });
    expect(inferFieldRole("bio", { type: "textarea" })).toMatchObject({ role: "description" });
  });

  it("heroImage for image/multiImage types", () => {
    expect(inferFieldRole("images", { type: "multiImage" })).toMatchObject({ role: "heroImage" });
    expect(inferFieldRole("avatar", { type: "image" })).toMatchObject({ role: "heroImage" });
  });

  it("price for number fields with price/cost/amount in name", () => {
    expect(inferFieldRole("currentPrice", { type: "number" })).toMatchObject({ role: "price" });
    expect(inferFieldRole("shippingCost", { type: "number" })).toMatchObject({ role: "price" });
    expect(inferFieldRole("totalAmount", { type: "number" })).toMatchObject({ role: "price" });
    expect(inferFieldRole("startPrice", { type: "number" })).toMatchObject({ role: "price" });
  });

  it("timer narrowed (v0.12) — только countdown-specific (expir*/countdown*/Until)", () => {
    // После v0.12 `deadline` → deadline, `auctionEnd` → info (fallback).
    // Timer остаётся для истинных countdown.
    expect(inferFieldRole("expiresAt", { type: "datetime" })).toMatchObject({ role: "timer" });
    expect(inferFieldRole("validUntil", { type: "datetime" })).toMatchObject({ role: "timer" });
    expect(inferFieldRole("deadline", { type: "datetime" })).toMatchObject({ role: "deadline" });
    expect(inferFieldRole("auctionEnd", { type: "datetime" })).toMatchObject({ role: "info" });
  });

  it("location for fields with location/from/city in name", () => {
    expect(inferFieldRole("shippingFrom", { type: "text" })).toMatchObject({ role: "location" });
    expect(inferFieldRole("location", { type: "text" })).toMatchObject({ role: "location" });
  });

  it("badge for enum type or status/condition name", () => {
    expect(inferFieldRole("condition", { type: "enum" })).toMatchObject({ role: "badge" });
    expect(inferFieldRole("status", { type: "text" })).toMatchObject({ role: "badge" });
  });

  it("metric for number fields that are not price", () => {
    expect(inferFieldRole("bidCount", { type: "number" })).toMatchObject({ role: "metric" });
    expect(inferFieldRole("viewCount", { type: "number" })).toMatchObject({ role: "metric" });
  });

  it("ref for entityRef type", () => {
    expect(inferFieldRole("sellerId", { type: "entityRef" })).toMatchObject({ role: "ref" });
  });

  it("info as fallback for non-special types", () => {
    expect(inferFieldRole("trackingNumber", { type: "text" })).toMatchObject({ role: "info" });
    expect(inferFieldRole("featured", { type: "boolean" })).toMatchObject({ role: "info" });
  });

  it("weight is metric (number without price/cost/amount)", () => {
    expect(inferFieldRole("weight", { type: "number" })).toMatchObject({ role: "metric" });
  });

  it("price takes priority over metric for number+price name", () => {
    expect(inferFieldRole("buyNowPrice", { type: "number" })).toMatchObject({ role: "price" });
  });

  it("shippingCost is price (not location)", () => {
    expect(inferFieldRole("shippingCost", { type: "number" })).toMatchObject({ role: "price" });
  });
});

describe("inferFieldRole — пространственные роли v1.7", () => {
  it("field с type 'coordinate' → role 'coordinate'", () => {
    expect(inferFieldRole("position", { type: "coordinate" })).toMatchObject({ role: "coordinate" });
  });

  it("field named 'lat' → role 'coordinate'", () => {
    expect(inferFieldRole("lat", { type: "number" })).toMatchObject({ role: "coordinate" });
  });

  it("field named 'lng' → role 'coordinate'", () => {
    expect(inferFieldRole("lng", { type: "number" })).toMatchObject({ role: "coordinate" });
  });

  it("field named 'coords' → role 'coordinate'", () => {
    expect(inferFieldRole("coords", {})).toMatchObject({ role: "coordinate" });
  });

  it("field named 'address' type text → role 'address'", () => {
    expect(inferFieldRole("address", { type: "text" })).toMatchObject({ role: "address" });
  });

  it("field 'deliveryAddress' → role 'address'", () => {
    expect(inferFieldRole("deliveryAddress", { type: "text" })).toMatchObject({ role: "address" });
  });

  it("field с type 'polygon' → role 'zone'", () => {
    expect(inferFieldRole("area", { type: "polygon" })).toMatchObject({ role: "zone" });
  });

  it("field named 'zone' → role 'zone'", () => {
    expect(inferFieldRole("zone", {})).toMatchObject({ role: "zone" });
  });

  it("numeric 'price' НЕ должен стать coordinate", () => {
    expect(inferFieldRole("price", { type: "number" })).toMatchObject({ role: "price" });
  });

  it("existing 'location' правило не сломано — city → 'location'", () => {
    expect(inferFieldRole("city", {})).toMatchObject({ role: "location" });
  });
});

describe("inferFieldRole — reliability (§15 v1.9 zazor #2)", () => {
  it("explicit fieldRole declaration → structural", () => {
    const result = inferFieldRole("price", { type: "number", fieldRole: "price" });
    expect(result).toEqual({ role: "price", reliability: "structural", basis: "explicit ontology declaration" });
  });

  it("type-based coordinate → rule-based", () => {
    const result = inferFieldRole("position", { type: "coordinate" });
    expect(result.reliability).toBe("rule-based");
    expect(result.basis).toContain("coordinate");
  });

  it("name-based price → heuristic", () => {
    const result = inferFieldRole("currentPrice", { type: "number" });
    expect(result.role).toBe("price");
    expect(result.reliability).toBe("heuristic");
    expect(result.basis).toContain("name substring");
  });

  it("fallback info → heuristic с fallback basis", () => {
    const result = inferFieldRole("randomXyz", { type: "text" });
    expect(result.role).toBe("info");
    expect(result.reliability).toBe("heuristic");
    expect(result.basis).toContain("fallback");
  });
});

describe("inferFieldRole — witness.pattern (§15 v1.10 zazor #3)", () => {
  it("name:title-synonym pattern", () => {
    expect(inferFieldRole("title", { type: "text" }))
      .toMatchObject({ pattern: "name:title-synonym" });
    expect(inferFieldRole("name", { type: "text" }))
      .toMatchObject({ pattern: "name:title-synonym" });
    expect(inferFieldRole("label", { type: "text" }))
      .toMatchObject({ pattern: "name:title-synonym" });
  });

  it("name:description-synonym pattern", () => {
    expect(inferFieldRole("description", { type: "textarea" }))
      .toMatchObject({ pattern: "name:description-synonym" });
    expect(inferFieldRole("bio", { type: "textarea" }))
      .toMatchObject({ pattern: "name:description-synonym" });
  });

  it("name:price-substring pattern", () => {
    expect(inferFieldRole("currentPrice", { type: "number" }))
      .toMatchObject({ pattern: "name:price-substring" });
    expect(inferFieldRole("shippingCost", { type: "number" }))
      .toMatchObject({ pattern: "name:price-substring" });
    expect(inferFieldRole("totalAmount", { type: "number" }))
      .toMatchObject({ pattern: "name:price-substring" });
  });

  it("name:timer-countdown / name:timer-until patterns (v0.12 narrowed)", () => {
    expect(inferFieldRole("expiresAt", { type: "datetime" }))
      .toMatchObject({ pattern: "name:timer-countdown" });
    expect(inferFieldRole("validUntil", { type: "datetime" }))
      .toMatchObject({ pattern: "name:timer-until" });
  });

  it("name:coordinate-set pattern (name-based, не type)", () => {
    expect(inferFieldRole("lat", { type: "number" }))
      .toMatchObject({ pattern: "name:coordinate-set" });
    expect(inferFieldRole("lng", { type: "number" }))
      .toMatchObject({ pattern: "name:coordinate-set" });
    expect(inferFieldRole("coords", {}))
      .toMatchObject({ pattern: "name:coordinate-set" });
  });

  it("name:address-suffix pattern", () => {
    expect(inferFieldRole("address", { type: "text" }))
      .toMatchObject({ pattern: "name:address-suffix" });
    expect(inferFieldRole("deliveryAddress", { type: "text" }))
      .toMatchObject({ pattern: "name:address-suffix" });
  });

  it("name:zone-set pattern (name-based)", () => {
    expect(inferFieldRole("zone", {}))
      .toMatchObject({ pattern: "name:zone-set" });
  });

  it("name:location-set pattern", () => {
    expect(inferFieldRole("city", {}))
      .toMatchObject({ pattern: "name:location-set" });
    expect(inferFieldRole("shippingFrom", { type: "text" }))
      .toMatchObject({ pattern: "name:location-set" });
  });

  it("name:badge-status pattern", () => {
    expect(inferFieldRole("status", { type: "text" }))
      .toMatchObject({ pattern: "name:badge-status" });
    expect(inferFieldRole("condition", { type: "text" }))
      .toMatchObject({ pattern: "name:badge-status" });
  });

  it("type:number-metric-fallback pattern", () => {
    expect(inferFieldRole("bidCount", { type: "number" }))
      .toMatchObject({ pattern: "type:number-metric-fallback" });
    expect(inferFieldRole("weight", { type: "number" }))
      .toMatchObject({ pattern: "type:number-metric-fallback" });
  });

  it("fallback:info pattern", () => {
    expect(inferFieldRole("trackingNumber", { type: "text" }))
      .toMatchObject({ pattern: "fallback:info" });
    expect(inferFieldRole("featured", { type: "boolean" }))
      .toMatchObject({ pattern: "fallback:info" });
  });

  it("structural — pattern не обязателен", () => {
    const result = inferFieldRole("price", { type: "number", fieldRole: "price" });
    expect(result.reliability).toBe("structural");
  });

  it("rule-based (type-based) — pattern не обязателен", () => {
    const result = inferFieldRole("position", { type: "coordinate" });
    expect(result.reliability).toBe("rule-based");
  });
});

describe("inferFieldRole — temporal roles (v0.12)", () => {
  describe("timestamp (audit)", () => {
    it.each([
      ["createdAt", { type: "datetime" }],
      ["updatedAt", { type: "datetime" }],
      ["modifiedAt", { type: "datetime" }],
      ["deletedAt", { type: "datetime" }],
      ["lastSeenAt", { type: "datetime" }],
      ["archivedAt", { type: "datetime" }],
    ])("%s → timestamp", (name, def) => {
      expect(inferFieldRole(name, def).role).toBe("timestamp");
    });

    it("witness: reliability heuristic + pattern", () => {
      const w = inferFieldRole("createdAt", { type: "datetime" });
      expect(w.reliability).toBe("heuristic");
      expect(w.pattern).toBe("temporal:timestamp-audit");
    });
  });

  describe("deadline (target date)", () => {
    it.each([
      ["dueDate", { type: "date" }],
      ["dueBy", { type: "datetime" }],
      ["dueAt", { type: "datetime" }],
      ["deadline", { type: "date" }],
      ["deadlineAt", { type: "datetime" }],
    ])("%s → deadline", (name, def) => {
      expect(inferFieldRole(name, def).role).toBe("deadline");
    });

    it("witness: pattern temporal:deadline", () => {
      const w = inferFieldRole("dueDate", { type: "date" });
      expect(w.pattern).toBe("temporal:deadline-due-prefix");
    });
  });

  describe("scheduled (planned future)", () => {
    it.each([
      ["scheduledAt", { type: "datetime" }],
      ["scheduledDate", { type: "date" }],
      ["appointmentAt", { type: "datetime" }],
      ["meetingAt", { type: "datetime" }],
      ["visitDate", { type: "date" }],
      ["eventDate", { type: "date" }],
      ["sessionAt", { type: "datetime" }],
    ])("%s → scheduled", (name, def) => {
      expect(inferFieldRole(name, def).role).toBe("scheduled");
    });
  });

  describe("occurred (past event)", () => {
    it.each([
      ["recordDate", { type: "date" }],
      ["administeredAt", { type: "datetime" }],
      ["startedAt", { type: "datetime" }],
      ["completedAt", { type: "datetime" }],
      ["finishedAt", { type: "datetime" }],
      ["closedAt", { type: "datetime" }],
      ["birthDate", { type: "date" }],
      ["endedAt", { type: "datetime" }],
      ["postedAt", { type: "datetime" }],
      ["shippedAt", { type: "datetime" }],
    ])("%s → occurred", (name, def) => {
      expect(inferFieldRole(name, def).role).toBe("occurred");
    });
  });

  describe("timer (narrowed — только countdown)", () => {
    it.each([
      ["expiresAt", { type: "datetime" }],
      ["expiryDate", { type: "date" }],
      ["validUntil", { type: "datetime" }],
      ["countdownAt", { type: "datetime" }],
    ])("%s → timer (unchanged)", (name, def) => {
      expect(inferFieldRole(name, def).role).toBe("timer");
    });

    it("deadline больше НЕ timer — переехал в deadline", () => {
      expect(inferFieldRole("deadline", { type: "date" }).role).toBe("deadline");
    });

    it("endAt без past-tense 'ed' → info fallback (не timer, не occurred)", () => {
      expect(inferFieldRole("endAt", { type: "datetime" }).role).toBe("info");
    });
  });

  describe("explicit fieldRole всегда побеждает", () => {
    it("createdAt с explicit 'info' → info, а не timestamp", () => {
      const w = inferFieldRole("createdAt", { type: "datetime", fieldRole: "info" });
      expect(w.role).toBe("info");
      expect(w.reliability).toBe("structural");
    });

    it("endAt с explicit 'timer' → timer", () => {
      const w = inferFieldRole("endAt", { type: "datetime", fieldRole: "timer" });
      expect(w.role).toBe("timer");
    });
  });

  describe("priority: timestamp > deadline > scheduled > occurred > existing", () => {
    it("createdAt имеет приоритет над general occurred", () => {
      expect(inferFieldRole("createdAt", { type: "datetime" }).role).toBe("timestamp");
    });

    it("scheduledEndAt — scheduled побеждает end→occurred", () => {
      expect(inferFieldRole("scheduledEndAt", { type: "datetime" }).role).toBe("scheduled");
    });
  });
});
