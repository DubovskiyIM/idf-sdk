import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/parse-args.js";

describe("parseArgs", () => {
  it("извлекает target-директорию как первый позиционный", () => {
    const { targetDir } = parseArgs(["my-app"]);
    expect(targetDir).toBe("my-app");
  });

  it("--ui-kit mantine задаёт UI-kit", () => {
    const { uiKit } = parseArgs(["my-app", "--ui-kit", "mantine"]);
    expect(uiKit).toBe("mantine");
  });

  it("ui-kit по умолчанию — mantine", () => {
    const { uiKit } = parseArgs(["my-app"]);
    expect(uiKit).toBe("mantine");
  });

  it("--template default задаёт шаблон", () => {
    const { template } = parseArgs(["my-app", "--template", "default"]);
    expect(template).toBe("default");
  });

  it("--help возвращает showHelp=true", () => {
    const { showHelp } = parseArgs(["--help"]);
    expect(showHelp).toBe(true);
  });

  it("отклоняет unknown ui-kit с ошибкой", () => {
    expect(() => parseArgs(["my-app", "--ui-kit", "bootstrap"])).toThrow(/ui-kit/);
  });

  it("требует targetDir если не --help", () => {
    expect(() => parseArgs([])).toThrow(/targetDir/);
  });
});
