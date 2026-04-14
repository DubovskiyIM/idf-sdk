import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["src/**/*.test.{js,jsx}"],
    environment: "jsdom",
  },
});
