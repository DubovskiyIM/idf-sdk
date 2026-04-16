import { describe, it, expect } from "vitest";
import * as domainTpl from "../src/templates/domain.tpl.js";
import * as seedTpl from "../src/templates/seed.tpl.js";
import * as testTpl from "../src/templates/crystallize-test.tpl.js";
import * as pkgTpl from "../src/templates/package-json.tpl.js";
import * as readmeTpl from "../src/templates/readme.tpl.js";

const FIXTURE = {
  name: "tasks",
  description: "Простой трекер задач для одного пользователя",
  entities: [
    { name: "Task", kind: "internal", fields: ["id", "userId", "title", "description", "status", "createdAt"] },
    { name: "Category", kind: "reference", fields: ["id", "name", "color"] },
  ],
  roles: [
    { id: "user", base: "owner", description: "Владелец задач" },
  ],
  intents: [
    {
      id: "create_task",
      title: "Создать задачу",
      entities: ["Task"],
      effects: [{ alpha: "add", target: "Task" }],
      requiredFor: ["user"],
    },
    {
      id: "complete_task",
      title: "Отметить выполненной",
      entities: ["Task"],
      effects: [{ alpha: "replace", target: "Task.status", value: "done" }],
      requiredFor: ["user"],
    },
  ],
};

describe("domain.tpl", () => {
  it("генерирует валидный JS-модуль", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain("export const ontology");
    expect(code).toContain("export const intents");
    expect(code).toContain("export const projections");
  });

  it("ontology содержит все entities", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"Task"');
    expect(code).toContain('"Category"');
  });

  it("ontology учитывает entity.kind", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"kind": "internal"');
    expect(code).toContain('"kind": "reference"');
  });

  it("inferFieldSpec проставляет money/datetime/id роли по имени", () => {
    const ctx = {
      ...FIXTURE,
      entities: [{ name: "Order", kind: "internal", fields: ["id", "totalAmount", "createdAt", "isPaid"] }],
    };
    const code = domainTpl.render(ctx);
    expect(code).toContain('"type": "id"');
    expect(code).toContain('"fieldRole": "money"');
    expect(code).toContain('"type": "datetime"');
    expect(code).toContain('"type": "boolean"');
  });

  it("ownerField — userId если есть", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"ownerField": "userId"');
  });

  it("projections генерируются только для non-reference entities", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"tasks_list"');
    expect(code).toContain('"tasks_detail"');
    expect(code).not.toContain('"categorys_list"');
  });

  it("projections используют поле kind (не archetype)", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"kind": "catalog"');
    expect(code).toContain('"kind": "detail"');
  });

  it("intents сериализуются с particles", () => {
    const code = domainTpl.render(FIXTURE);
    expect(code).toContain('"id": "create_task"');
    expect(code).toContain('"particles"');
    expect(code).toContain('"confirmation"');
  });
});

describe("seed.tpl", () => {
  it("создаёт коллекцию для каждой non-reference сущности", () => {
    const code = seedTpl.render(FIXTURE);
    expect(code).toContain("tasks:");
    expect(code).not.toContain("categorys:"); // reference пропущен
  });

  it("sample-запись имеет id-поле", () => {
    const code = seedTpl.render(FIXTURE);
    expect(code).toMatch(/"id":\s*"task_1"/);
  });
});

describe("crystallize-test.tpl", () => {
  it("импортирует из domain.js и seed.js", () => {
    const code = testTpl.render(FIXTURE);
    expect(code).toContain('from "../domain.js"');
    expect(code).toContain('from "../seed.js"');
  });

  it("содержит smoke-проверку crystallizeV2", () => {
    const code = testTpl.render(FIXTURE);
    expect(code).toContain("crystallizeV2");
    expect(code).toContain("artifact");
  });
});

describe("package-json.tpl", () => {
  it("валидный JSON с корректным name", () => {
    const code = pkgTpl.render(FIXTURE);
    const pkg = JSON.parse(code);
    expect(pkg.name).toBe("idf-domain-tasks");
    expect(pkg.dependencies["@intent-driven/core"]).toBeDefined();
  });
});

describe("readme.tpl", () => {
  it("упоминает все сущности и роли", () => {
    const code = readmeTpl.render(FIXTURE);
    expect(code).toContain("`Task`");
    expect(code).toContain("`Category`");
    expect(code).toContain("`user`");
  });

  it("упоминает количество намерений", () => {
    const code = readmeTpl.render(FIXTURE);
    expect(code).toContain("Намерения (2)");
  });
});
