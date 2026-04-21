import { describe, it, expect } from "vitest";
import { substitute } from "../src/substitute.js";

describe("substitute", () => {
  it("заменяет __PROJECT_NAME__ на переданное значение", () => {
    const input = '{"name": "__PROJECT_NAME__"}';
    const result = substitute(input, { PROJECT_NAME: "my-crm" });
    expect(result).toBe('{"name": "my-crm"}');
  });

  it("заменяет несколько placeholder'ов одновременно", () => {
    const input = "name=__PROJECT_NAME__ kit=__UI_KIT__";
    const result = substitute(input, { PROJECT_NAME: "foo", UI_KIT: "mantine" });
    expect(result).toBe("name=foo kit=mantine");
  });

  it("оставляет незамещённый placeholder как есть", () => {
    const input = "__UNKNOWN__";
    const result = substitute(input, { PROJECT_NAME: "x" });
    expect(result).toBe("__UNKNOWN__");
  });

  it("экранирует regex-мета в replacement-значении", () => {
    const input = "__AUTHOR__";
    const result = substitute(input, { AUTHOR: "Ivan $1 \\0" });
    expect(result).toBe("Ivan $1 \\0");
  });
});
