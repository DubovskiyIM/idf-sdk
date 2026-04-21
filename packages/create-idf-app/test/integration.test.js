import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold.js";

describe("integration: scaffold реального FS", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "idf-scaffold-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("создаёт полную структуру default-template'а", async () => {
    const pkgRoot = path.resolve(import.meta.dirname, "..");
    const templateDir = path.join(pkgRoot, "templates", "default");
    const targetDir = path.join(tmp, "my-app");

    await scaffold({
      templateDir,
      targetDir,
      vars: { PROJECT_NAME: "my-app", UI_KIT: "mantine" },
      fs,
    });

    const expected = [
      "package.json",
      "vite.config.js",
      "vercel.json",
      "index.html",
      ".env.example",
      ".gitignore",
      "README.md",
      "src/main.jsx",
      "src/app.jsx",
      "src/config.js",
      "src/domains/default/ontology.js",
      "src/domains/default/effects.js",
      "api/health.js",
      "api/document/[...slug].js",
      "api/voice/[...slug].js",
      "api/agent/[...slug].js",
    ];

    for (const file of expected) {
      const full = path.join(targetDir, file);
      const stat = await fs.stat(full);
      expect(stat.isFile(), `${file} должен существовать`).toBe(true);
    }
  });

  it("placeholder'ы заменены в package.json", async () => {
    const pkgRoot = path.resolve(import.meta.dirname, "..");
    const templateDir = path.join(pkgRoot, "templates", "default");
    const targetDir = path.join(tmp, "my-app");

    await scaffold({
      templateDir,
      targetDir,
      vars: { PROJECT_NAME: "my-app", UI_KIT: "mantine" },
      fs,
    });

    const pkg = JSON.parse(
      await fs.readFile(path.join(targetDir, "package.json"), "utf8")
    );
    expect(pkg.name).toBe("my-app");
    expect(pkg.dependencies["@intent-driven/adapter-mantine"]).toBeTruthy();
  });

  it("placeholder'ы заменены в config.js", async () => {
    const pkgRoot = path.resolve(import.meta.dirname, "..");
    const templateDir = path.join(pkgRoot, "templates", "default");
    const targetDir = path.join(tmp, "my-app");

    await scaffold({
      templateDir,
      targetDir,
      vars: { PROJECT_NAME: "my-app", UI_KIT: "shadcn" },
      fs,
    });

    const cfg = await fs.readFile(path.join(targetDir, "src/config.js"), "utf8");
    expect(cfg).toContain('projectName: "my-app"');
    expect(cfg).toContain('"shadcn"');
  });
});
