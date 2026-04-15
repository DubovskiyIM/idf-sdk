import React from "react";
import {
  MantineProvider,
  ColorSchemeScript,
  localStorageColorSchemeManager,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { registerUIAdapter } from "@intent-driven/renderer";
import { mantineAdapter } from "./adapter.jsx";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

/**
 * Оборачивает приложение: регистрирует mantineAdapter в @intent-driven/renderer,
 * монтирует MantineProvider + DatesProvider с дефолтными настройками.
 */
export function MantineAdapterProvider({
  children,
  colorSchemeManager,
  theme = { primaryColor: "indigo" },
  datesSettings = { locale: "ru", firstDayOfWeek: 1, weekendDays: [0, 6] },
  defaultColorScheme = "light",
}) {
  React.useEffect(() => {
    registerUIAdapter(mantineAdapter);
  }, []);

  return (
    <>
      <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      <MantineProvider
        defaultColorScheme={defaultColorScheme}
        colorSchemeManager={
          colorSchemeManager ?? localStorageColorSchemeManager({ key: "idf_theme" })
        }
        theme={theme}
      >
        <DatesProvider settings={datesSettings}>{children}</DatesProvider>
      </MantineProvider>
    </>
  );
}
