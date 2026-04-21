/**
 * UI-kit-specific token mapping для scaffold template.
 *
 * Каждый ui-kit требует:
 *  - свой adapter (mantineAdapter / antdAdapter / …)
 *  - свой Provider-wrapper (<MantineProvider> / <ConfigProvider>)
 *  - свой набор npm-зависимостей (@mantine/core, antd, …)
 *  - опционально — css-side-effect import
 *
 * CLI вычисляет эти токены и передаёт в substitute — app.jsx.tmpl и
 * package.json.tmpl получают соответствующую инъекцию.
 */

const REGISTRY = {
  mantine: {
    adapterName: "mantineAdapter",
    extraImports: `import { MantineProvider } from "@mantine/core";`,
    providerOpen: `<MantineProvider>`,
    providerClose: `</MantineProvider>`,
    cssImport: `import "@mantine/core/styles.css";`,
    extraDeps: [
      `"@mantine/core": "^9.0.0"`,
      `"@mantine/dates": "^9.0.0"`,
      `"@mantine/hooks": "^9.0.0"`,
    ],
  },
  antd: {
    adapterName: "antdAdapter",
    extraImports: `import { ConfigProvider } from "antd";\nimport ruRU from "antd/locale/ru_RU";`,
    providerOpen: `<ConfigProvider locale={ruRU}>`,
    providerClose: `</ConfigProvider>`,
    cssImport: ``,
    extraDeps: [
      `"antd": "^5.0.0"`,
      `"@ant-design/icons": "^5.0.0"`,
      `"dayjs": "^1.11.0"`,
    ],
  },
  apple: {
    adapterName: "appleAdapter",
    extraImports: ``,
    providerOpen: `<div>`,
    providerClose: `</div>`,
    cssImport: ``,
    extraDeps: [],
  },
  shadcn: {
    adapterName: "shadcnAdapter",
    extraImports: ``,
    providerOpen: `<div>`,
    providerClose: `</div>`,
    cssImport: ``,
    extraDeps: [
      `"class-variance-authority": "^0.7.0"`,
      `"clsx": "^2.1.0"`,
      `"tailwind-merge": "^2.0.0"`,
    ],
  },
};

/**
 * Построить substitute-vars для выбранного ui-kit.
 * Возвращает merge'д-объект: базовые vars + ui-kit токены.
 */
export function buildVars({ projectName, uiKit }) {
  const cfg = REGISTRY[uiKit] || REGISTRY.mantine;
  const depsBlock = cfg.extraDeps.length > 0
    ? cfg.extraDeps.map(d => "    " + d + ",").join("\n")
    : "";

  return {
    PROJECT_NAME: projectName,
    UI_KIT: uiKit,
    UI_KIT_ADAPTER_NAME: cfg.adapterName,
    UI_KIT_EXTRA_IMPORTS: cfg.extraImports,
    UI_KIT_PROVIDER_OPEN: cfg.providerOpen,
    UI_KIT_PROVIDER_CLOSE: cfg.providerClose,
    UI_KIT_CSS_IMPORT: cfg.cssImport,
    UI_KIT_EXTRA_DEPS: depsBlock,
  };
}

export function isKnownUiKit(name) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name);
}
