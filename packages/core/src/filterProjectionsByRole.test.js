import { describe, it, expect } from "vitest";
import {
  filterProjectionsByRole,
  isProjectionAvailableForRole,
  partitionProjectionsByRole,
} from "./filterProjectionsByRole.js";

const PROJECTIONS = {
  task_catalog_public: { kind: "catalog" }, // без forRoles — видим всем
  my_tasks: { kind: "catalog", forRoles: ["customer"] },
  my_responses: { kind: "catalog", forRoles: ["executor"] },
  my_deals: { kind: "catalog", forRoles: ["customer", "executor"] },
  wallet: { kind: "detail", forRoles: ["customer", "executor"] },
  admin_audit: { kind: "catalog", forRoles: ["admin"] },
};

describe("filterProjectionsByRole / §4.9", () => {
  describe("isProjectionAvailableForRole", () => {
    it("без forRoles — видим всем (включая null)", () => {
      expect(isProjectionAvailableForRole(PROJECTIONS.task_catalog_public, "customer")).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.task_catalog_public, "executor")).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.task_catalog_public, null)).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.task_catalog_public, undefined)).toBe(true);
    });

    it("forRoles:['customer'] — видим только customer'у", () => {
      expect(isProjectionAvailableForRole(PROJECTIONS.my_tasks, "customer")).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.my_tasks, "executor")).toBe(false);
      expect(isProjectionAvailableForRole(PROJECTIONS.my_tasks, null)).toBe(false);
    });

    it("forRoles:['customer','executor'] — видим обеим (shared)", () => {
      expect(isProjectionAvailableForRole(PROJECTIONS.my_deals, "customer")).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.my_deals, "executor")).toBe(true);
      expect(isProjectionAvailableForRole(PROJECTIONS.my_deals, "admin")).toBe(false);
    });

    it("пустой forRoles-array — backward-compat как 'видим всем'", () => {
      expect(isProjectionAvailableForRole({ forRoles: [] }, "customer")).toBe(true);
    });

    it("null/undefined projection → false", () => {
      expect(isProjectionAvailableForRole(null, "customer")).toBe(false);
      expect(isProjectionAvailableForRole(undefined, "customer")).toBe(false);
    });
  });

  describe("filterProjectionsByRole", () => {
    const ROOT = ["task_catalog_public", "my_tasks", "my_responses", "my_deals", "wallet", "admin_audit"];

    it("customer видит: публичные + customer-specific + shared", () => {
      const result = filterProjectionsByRole(ROOT, PROJECTIONS, "customer");
      expect(result).toEqual(["task_catalog_public", "my_tasks", "my_deals", "wallet"]);
    });

    it("executor видит: публичные + executor-specific + shared", () => {
      const result = filterProjectionsByRole(ROOT, PROJECTIONS, "executor");
      expect(result).toEqual(["task_catalog_public", "my_responses", "my_deals", "wallet"]);
    });

    it("admin видит: публичные + admin-specific", () => {
      const result = filterProjectionsByRole(ROOT, PROJECTIONS, "admin");
      expect(result).toEqual(["task_catalog_public", "admin_audit"]);
    });

    it("preserves input order", () => {
      const custom = ["wallet", "task_catalog_public", "my_tasks"];
      expect(filterProjectionsByRole(custom, PROJECTIONS, "customer")).toEqual(custom);
    });

    it("без projections map — pass-through", () => {
      expect(filterProjectionsByRole(ROOT, null, "customer")).toEqual(ROOT);
    });

    it("не-массив input → []", () => {
      expect(filterProjectionsByRole(null, PROJECTIONS, "customer")).toEqual([]);
    });

    it("unknown projection id — treated as available (projection undefined → isAvailable false)", () => {
      // Рассуждение: если projection не найдена в map, она не доступна
      // для рендера (безопаснее скрыть чем показать unknown). Но тест
      // фиксирует текущее поведение — filtered out.
      const result = filterProjectionsByRole(["ghost"], PROJECTIONS, "customer");
      expect(result).toEqual([]);
    });
  });

  describe("partitionProjectionsByRole", () => {
    it("возвращает visible + hidden с reasons", () => {
      const { visible, hidden } = partitionProjectionsByRole(
        ["task_catalog_public", "my_tasks", "my_responses"],
        PROJECTIONS,
        "customer",
      );
      expect(visible).toEqual(["task_catalog_public", "my_tasks"]);
      expect(hidden).toEqual([{ id: "my_responses", forRoles: ["executor"] }]);
    });

    it("unknown projection — в hidden с forRoles:[]", () => {
      const { hidden } = partitionProjectionsByRole(["ghost"], PROJECTIONS, "customer");
      expect(hidden).toEqual([{ id: "ghost", forRoles: [] }]);
    });
  });
});
