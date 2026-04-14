import React from "react";
import { registerUIAdapter } from "@idf/renderer";
import { shadcnAdapter } from "./adapter.jsx";
import "./theme.css";

/**
 * Оборачивает приложение: регистрирует shadcnAdapter в @idf/renderer.
 * Doodle-стилистика подключается через theme.css.
 */
export function ShadcnAdapterProvider({ children }) {
  React.useEffect(() => {
    registerUIAdapter(shadcnAdapter);
  }, []);
  return <>{children}</>;
}
