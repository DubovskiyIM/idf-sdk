import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { renderTemplate } from "../src/templates/render.js";
import { validateGenerated } from "../src/validate.js";

/**
 * E2E: симулируем то, что сделал бы init.js после успешного LLM-диалога —
 * рендерим шаблоны на диск с фиксированным контекстом, прогоняем validate.
 * Без сети, без API-ключа — гарантия что цепочка template → файл →
 * crystallizeV2 работает на полном корпусе LLM-вывода.
 */

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
    {
      id: "delete_task",
      title: "Удалить",
      entities: ["Task"],
      effects: [{ alpha: "remove", target: "Task" }],
      requiredFor: ["user"],
    },
  ],
};

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "idf-cli-e2e-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("CLI init flow (e2e, без LLM)", () => {
  it("рендерит и записывает все 5 файлов на диск", async () => {
    await mkdir(join(tmpDir, "test"), { recursive: true });
    const files = [
      ["domain.js", "domain.js.tmpl"],
      ["seed.js", "seed.js.tmpl"],
      ["test/crystallize.test.js", "crystallize.test.js.tmpl"],
      ["package.json", "package.json.tmpl"],
      ["README.md", "README.md.tmpl"],
    ];
    for (const [path, tpl] of files) {
      const content = await renderTemplate(tpl, FIXTURE);
      await writeFile(join(tmpDir, path), content, "utf8");
    }
    for (const [path] of files) {
      expect(existsSync(join(tmpDir, path)), `файл ${path} не создан`).toBe(true);
    }
  });

  it("сгенерированный domain.js — валидный ES-модуль с правильными экспортами", async () => {
    const content = await renderTemplate("domain.js.tmpl", FIXTURE);
    await writeFile(join(tmpDir, "domain.js"), content, "utf8");
    const mod = await import(join(tmpDir, "domain.js"));
    expect(mod.ontology).toBeDefined();
    expect(mod.intents).toBeDefined();
    expect(mod.projections).toBeDefined();
    expect(Object.keys(mod.ontology.entities)).toContain("Task");
    expect(Object.keys(mod.intents)).toContain("create_task");
  });

  it("validateGenerated прогоняет crystallizeV2 → артефакт собран", async () => {
    await mkdir(join(tmpDir, "test"), { recursive: true });
    const files = [
      ["domain.js", "domain.js.tmpl"],
      ["seed.js", "seed.js.tmpl"],
      ["test/crystallize.test.js", "crystallize.test.js.tmpl"],
    ];
    for (const [path, tpl] of files) {
      const content = await renderTemplate(tpl, FIXTURE);
      await writeFile(join(tmpDir, path), content, "utf8");
    }

    const result = await validateGenerated(tmpDir);
    expect(result.intentsCount).toBe(3);
    expect(result.projectionsCount).toBeGreaterThan(0);
    // Task entity → 2 проекции (catalog + detail), Category — reference, без проекций.
    expect(result.projectionsCount).toBe(2);
  });

  it("seed.js содержит коллекцию для Task, не для Category", async () => {
    const content = await renderTemplate("seed.js.tmpl", FIXTURE);
    await writeFile(join(tmpDir, "seed.js"), content, "utf8");
    const seedMod = await import(join(tmpDir, "seed.js"));
    expect(seedMod.default.tasks).toBeDefined();
    expect(seedMod.default.tasks).toHaveLength(1);
    expect(seedMod.default.categorys).toBeUndefined();
  });

  it("package.json валиден и ссылается на @intent-driven/core", async () => {
    const content = await renderTemplate("package.json.tmpl", FIXTURE);
    await writeFile(join(tmpDir, "package.json"), content, "utf8");
    const pkg = JSON.parse(readFileSync(join(tmpDir, "package.json"), "utf8"));
    expect(pkg.name).toBe("idf-domain-tasks");
    expect(pkg.dependencies["@intent-driven/core"]).toBeDefined();
  });
});
