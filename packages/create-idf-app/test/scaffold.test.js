import { describe, it, expect, beforeEach } from "vitest";
import { vol } from "memfs";
import { scaffold } from "../src/scaffold.js";

beforeEach(() => {
  vol.reset();
});

describe("scaffold", () => {
  it("копирует файлы из templateDir в targetDir, заменяя placeholder'ы в .tmpl-файлах", async () => {
    vol.fromJSON({
      "/tpl/package.json.tmpl": '{"name": "__PROJECT_NAME__"}',
      "/tpl/src/main.jsx": "// plain file",
    });

    await scaffold({
      templateDir: "/tpl",
      targetDir: "/out",
      vars: { PROJECT_NAME: "my-app", UI_KIT: "mantine" },
      fs: vol.promises,
    });

    const pkg = await vol.promises.readFile("/out/package.json", "utf8");
    const main = await vol.promises.readFile("/out/src/main.jsx", "utf8");
    expect(pkg).toBe('{"name": "my-app"}');
    expect(main).toBe("// plain file");
  });

  it(".tmpl-суффикс удаляется при записи", async () => {
    vol.fromJSON({ "/tpl/vercel.json.tmpl": '{"name": "__PROJECT_NAME__"}' });
    await scaffold({
      templateDir: "/tpl",
      targetDir: "/out",
      vars: { PROJECT_NAME: "x" },
      fs: vol.promises,
    });
    const entries = await vol.promises.readdir("/out");
    expect(entries).toContain("vercel.json");
    expect(entries).not.toContain("vercel.json.tmpl");
  });

  it("ошибается если targetDir уже существует и не пустой", async () => {
    vol.fromJSON({
      "/out/existing.txt": "x",
      "/tpl/a.txt": "a",
    });
    await expect(
      scaffold({ templateDir: "/tpl", targetDir: "/out", vars: {}, fs: vol.promises })
    ).rejects.toThrow(/not empty/i);
  });

  it("создаёт пустой targetDir если его нет", async () => {
    vol.fromJSON({ "/tpl/a.txt": "a" });
    await scaffold({ templateDir: "/tpl", targetDir: "/new", vars: {}, fs: vol.promises });
    const content = await vol.promises.readFile("/new/a.txt", "utf8");
    expect(content).toBe("a");
  });
});
