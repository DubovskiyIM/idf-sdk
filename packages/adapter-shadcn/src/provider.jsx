import React from "react";
import { registerUIAdapter } from "@idf/renderer";
import { shadcnAdapter } from "./adapter.jsx";

/**
 * Оборачивает приложение: регистрирует shadcnAdapter в @idf/renderer.
 * Doodle-стилистика подключается через theme.css — хост обязан явно
 * импортировать "@idf/adapter-shadcn/styles.css" из своего entry-файла,
 * чтобы Vite/Tailwind-плагин правильно обработал @import "tailwindcss".
 */
export function ShadcnAdapterProvider({ children }) {
  React.useEffect(() => {
    registerUIAdapter(shadcnAdapter);
  }, []);
  return <>{children}</>;
}
