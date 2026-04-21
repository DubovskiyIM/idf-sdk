import { describe, it, expect } from "vitest";
import { detectPackageManager } from "../src/detect-pm.js";

describe("detectPackageManager", () => {
  it("возвращает pnpm если npm_config_user_agent начинается на pnpm", () => {
    const env = { npm_config_user_agent: "pnpm/9.0.0 node/20.0.0" };
    expect(detectPackageManager(env)).toBe("pnpm");
  });

  it("возвращает yarn если user_agent на yarn", () => {
    const env = { npm_config_user_agent: "yarn/1.22.0" };
    expect(detectPackageManager(env)).toBe("yarn");
  });

  it("возвращает npm по умолчанию", () => {
    expect(detectPackageManager({})).toBe("npm");
  });

  it("возвращает npm если user_agent содержит npm", () => {
    const env = { npm_config_user_agent: "npm/10.0.0 node/20.0.0" };
    expect(detectPackageManager(env)).toBe("npm");
  });
});
