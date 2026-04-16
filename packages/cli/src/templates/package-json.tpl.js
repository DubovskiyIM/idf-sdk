export function render(ctx) {
  const { name, description } = ctx;
  return JSON.stringify({
    name: `idf-domain-${name}`,
    version: "0.1.0",
    description: `IDF-домен: ${description}`,
    type: "module",
    private: true,
    scripts: {
      test: "vitest run",
    },
    dependencies: {
      "@intent-driven/core": "^0.4.0",
    },
    devDependencies: {
      vitest: "^4.1.0",
    },
  }, null, 2) + "\n";
}
