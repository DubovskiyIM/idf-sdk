/**
 * Permission-inheritance tests (§12.8 Notion field test).
 *
 * Тестирует declarative `entity.permissionInheritance` API и интеграцию
 * с filterWorldForRole. Сценарий — Notion-style: Page hierarchy с per-row
 * PagePermission, fallback на Workspace.defaultPermissionLevel.
 */
import { describe, it, expect } from "vitest";
import { resolveInheritedPermission, isInheritablePermission } from "./permissionInheritance.js";
import { filterWorldForRole } from "./filterWorld.js";

const NOTION_LIKE_ONTOLOGY = {
  entities: {
    User: { ownerField: "id", fields: { id: { type: "text" } } },
    Workspace: {
      ownerField: "ownerId",
      fields: {
        id: { type: "text" },
        ownerId: { type: "entityRef", entity: "User" },
        defaultPermissionLevel: { type: "select" },
      },
    },
    Page: {
      permissionInheritance: {
        via: "pagePermissions",
        matchField: "pageId",
        userField: "userId",
        levelField: "level",
        parentField: "parentPageId",
        rootEntity: "Workspace",
        rootMatchField: "workspaceId",
        rootLevelField: "defaultPermissionLevel",
        levels: ["none", "view", "comment", "edit"],
        requiredLevel: "view",
      },
      fields: {
        id: { type: "text" },
        workspaceId: { type: "entityRef", entity: "Workspace" },
        parentPageId: { type: "entityRef", entity: "Page" },
        title: { type: "text" },
      },
    },
    PagePermission: {
      kind: "assignment",
      role: { scope: "pageId" },
      fields: {
        id: { type: "text" },
        pageId: { type: "entityRef", entity: "Page" },
        userId: { type: "entityRef", entity: "User" },
        level: { type: "select" },
      },
    },
  },
  roles: {
    workspaceOwner: {
      base: "owner",
      visibleFields: {
        Workspace: ["*"],
        Page: ["*"],
        PagePermission: ["*"],
      },
    },
    member: {
      base: "viewer",
      // Page не имеет ownerField — видимость только через permissionInheritance.
      visibleFields: {
        Workspace: ["id", "name"],
        Page: ["id", "workspaceId", "parentPageId", "title"],
        PagePermission: ["id", "pageId", "userId", "level"],
      },
    },
  },
};

const NOTION_LIKE_WORLD = {
  users: [
    { id: "u-anna" },
    { id: "u-boris" },
    { id: "u-vera" },
  ],
  workspaces: [
    { id: "ws-fold", ownerId: "u-anna", defaultPermissionLevel: "view" },
    { id: "ws-private", ownerId: "u-anna", defaultPermissionLevel: "none" },
  ],
  pages: [
    // Дерево в ws-fold:
    //   p-root
    //     p-child-1
    //       p-grandchild
    //     p-child-2
    { id: "p-root", workspaceId: "ws-fold", parentPageId: null, title: "Root" },
    { id: "p-child-1", workspaceId: "ws-fold", parentPageId: "p-root", title: "Child 1" },
    { id: "p-child-2", workspaceId: "ws-fold", parentPageId: "p-root", title: "Child 2" },
    { id: "p-grandchild", workspaceId: "ws-fold", parentPageId: "p-child-1", title: "Grandchild" },
    // Дерево в ws-private (default = none):
    { id: "p-private-root", workspaceId: "ws-private", parentPageId: null, title: "Secret" },
    { id: "p-private-child", workspaceId: "ws-private", parentPageId: "p-private-root", title: "Secret child" },
  ],
  pagePermissions: [
    // Boris имеет explicit edit на p-child-1 (наследуется на p-grandchild).
    { id: "pp-1", pageId: "p-child-1", userId: "u-boris", level: "edit" },
    // Vera имеет comment на p-private-root (даже если ws default=none).
    { id: "pp-2", pageId: "p-private-root", userId: "u-vera", level: "comment" },
    // Vera имеет explicit "none" override на p-child-2 (отрезает workspace default=view).
    { id: "pp-3", pageId: "p-child-2", userId: "u-vera", level: "none" },
  ],
};

describe("resolveInheritedPermission", () => {
  const config = NOTION_LIKE_ONTOLOGY.entities.Page.permissionInheritance;

  it("workspace-owner workspace default = view → user видит все pages в ws-fold", () => {
    // Вера в ws-fold, default=view, нет override → effective=view → visible
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[0], // p-root
      "u-vera",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("view");
  });

  it("explicit override на ancestor наследуется вниз", () => {
    // Boris имеет edit на p-child-1 → наследуется на p-grandchild
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[3], // p-grandchild
      "u-boris",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("edit");
  });

  it("explicit override на собственной странице побеждает workspace default", () => {
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[1], // p-child-1
      "u-boris",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("edit");
  });

  it("explicit «none» override отрезает workspace default", () => {
    // Vera видит default=view в ws-fold, но имеет override=none на p-child-2
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[2], // p-child-2
      "u-vera",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("none");
  });

  it("workspace default = none + нет override → none (private workspace)", () => {
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[5], // p-private-child
      "u-boris",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("none");
  });

  it("override на ancestor работает в private workspace", () => {
    // Vera имеет comment на p-private-root → наследуется на p-private-child
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[5], // p-private-child
      "u-vera",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("comment");
  });

  it("walks parent chain пока не найдёт override", () => {
    // Boris не имеет override на p-grandchild напрямую, но имеет на p-child-1
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[3], // p-grandchild
      "u-boris",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBe("edit");
  });

  it("returns null если viewer.id отсутствует", () => {
    const lvl = resolveInheritedPermission(
      NOTION_LIKE_WORLD.pages[0],
      null,
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBeNull();
  });

  it("returns null если row отсутствует", () => {
    const lvl = resolveInheritedPermission(
      null,
      "u-boris",
      config,
      NOTION_LIKE_WORLD,
    );
    expect(lvl).toBeNull();
  });

  it("безопасно при cycle (защитный break после N hops)", () => {
    const cyclicWorld = {
      ...NOTION_LIKE_WORLD,
      pages: [
        { id: "p-cycle-a", workspaceId: "ws-fold", parentPageId: "p-cycle-b", title: "A" },
        { id: "p-cycle-b", workspaceId: "ws-fold", parentPageId: "p-cycle-a", title: "B" },
      ],
      pagePermissions: [],
    };
    // Должен не зависнуть; возвращает workspace default
    const lvl = resolveInheritedPermission(
      cyclicWorld.pages[0],
      "u-boris",
      config,
      cyclicWorld,
    );
    expect(lvl).toBe("view"); // workspace default fallback
  });

  it("использует closest override в цепочке (override на p-child-1 побеждает override на p-root)", () => {
    const worldWithRootAndChild = {
      ...NOTION_LIKE_WORLD,
      pagePermissions: [
        { id: "pp-x", pageId: "p-root", userId: "u-vera", level: "view" },
        { id: "pp-y", pageId: "p-child-1", userId: "u-vera", level: "edit" },
      ],
    };
    const lvl = resolveInheritedPermission(
      worldWithRootAndChild.pages[3], // p-grandchild
      "u-vera",
      config,
      worldWithRootAndChild,
    );
    expect(lvl).toBe("edit");
  });
});

describe("isInheritablePermission", () => {
  it("признаёт правильно сконфигурированный entity", () => {
    expect(isInheritablePermission(NOTION_LIKE_ONTOLOGY.entities.Page)).toBe(true);
  });

  it("отвергает entity без permissionInheritance", () => {
    expect(isInheritablePermission(NOTION_LIKE_ONTOLOGY.entities.User)).toBe(false);
  });

  it("отвергает невалидный config (отсутствует обязательное поле)", () => {
    const bad = { permissionInheritance: { via: "x" } };
    expect(isInheritablePermission(bad)).toBe(false);
  });
});

describe("filterWorldForRole — интеграция с permission-inheritance", () => {
  it("workspaceOwner: видит всё (как раньше — без изменений)", () => {
    const filtered = filterWorldForRole(
      NOTION_LIKE_WORLD,
      NOTION_LIKE_ONTOLOGY,
      "workspaceOwner",
      { id: "u-anna" },
    );
    expect(filtered.pages.length).toBe(6); // все 6 pages из 2 workspaces
  });

  it("member u-boris: видит ws-fold (default=view) + ws-private skipped (override на p-child-1 не помогает в другом workspace)", () => {
    const filtered = filterWorldForRole(
      NOTION_LIKE_WORLD,
      NOTION_LIKE_ONTOLOGY,
      "member",
      { id: "u-boris" },
    );
    // ws-fold default=view → 4 pages (p-root, p-child-1, p-child-2, p-grandchild)
    // ws-private default=none, нет override для boris → 0 pages
    const ids = filtered.pages.map(p => p.id).sort();
    expect(ids).toEqual(["p-child-1", "p-child-2", "p-grandchild", "p-root"]);
  });

  it("member u-vera: ws-fold default=view, но override=none на p-child-2 → 3 visible; ws-private — 2 (через override на p-private-root)", () => {
    const filtered = filterWorldForRole(
      NOTION_LIKE_WORLD,
      NOTION_LIKE_ONTOLOGY,
      "member",
      { id: "u-vera" },
    );
    const ids = filtered.pages.map(p => p.id).sort();
    // ws-fold (default=view): p-root, p-child-1, p-grandchild — visible. p-child-2 hidden (override=none).
    // ws-private (default=none): p-private-root visible (override=comment), p-private-child visible (наследуется)
    expect(ids).toEqual(["p-child-1", "p-grandchild", "p-private-child", "p-private-root", "p-root"]);
  });

  it("permissionInheritance не ломает entity без декларации", () => {
    // PagePermission и Workspace не имеют permissionInheritance — должны фильтроваться по-старому
    const filtered = filterWorldForRole(
      NOTION_LIKE_WORLD,
      NOTION_LIKE_ONTOLOGY,
      "workspaceOwner",
      { id: "u-anna" },
    );
    expect(filtered.workspaces.length).toBe(2); // u-anna owns both
    expect(filtered.pagePermissions.length).toBe(3);
  });

  it("backward-compat: ontology без permissionInheritance работает как раньше", () => {
    const oldOntology = {
      entities: {
        User: { ownerField: "id", fields: { id: { type: "text" } } },
        Note: { ownerField: "userId", fields: { id: { type: "text" }, userId: { type: "text" } } },
      },
      roles: {
        member: {
          base: "viewer",
          visibleFields: { Note: ["id", "userId"], User: ["id"] },
        },
      },
    };
    const oldWorld = {
      users: [{ id: "u-1" }, { id: "u-2" }],
      notes: [
        { id: "n-1", userId: "u-1" },
        { id: "n-2", userId: "u-2" },
      ],
    };
    const filtered = filterWorldForRole(oldWorld, oldOntology, "member", { id: "u-1" });
    expect(filtered.notes.length).toBe(1);
    expect(filtered.notes[0].id).toBe("n-1");
  });
});
