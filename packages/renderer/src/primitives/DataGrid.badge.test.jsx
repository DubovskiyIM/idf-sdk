// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DataGrid from "./DataGrid.jsx";

afterEach(cleanup);

const apps = [
  { id: "a1", name: "frontend",       syncStatus: "Synced",    healthStatus: "Healthy" },
  { id: "a2", name: "payments-api",   syncStatus: "OutOfSync", healthStatus: "Degraded" },
  { id: "a3", name: "legacy-billing", syncStatus: "Unknown",   healthStatus: "Missing" },
];

const columns = [
  { key: "name", label: "Name" },
  {
    key: "syncStatus",
    label: "Sync",
    kind: "badge",
    colorMap: {
      Synced: "success",
      OutOfSync: "warning",
      Unknown: "neutral",
    },
  },
  {
    key: "healthStatus",
    label: "Health",
    kind: "badge",
    colorMap: {
      Healthy: "success",
      Progressing: "info",
      Degraded: "danger",
      Missing: "neutral",
      Suspended: "warning",
      Unknown: "neutral",
    },
  },
];

describe("DataGrid — badge column", () => {
  it("рендерит raw значения в badge-cells (через Badge primitive fallback)", () => {
    render(<DataGrid node={{ type: "dataGrid", items: apps, columns }} />);
    // Значения присутствуют — Badge-fallback оборачивает в inline-span
    expect(screen.getByText("Synced")).toBeTruthy();
    expect(screen.getByText("OutOfSync")).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.getByText("Degraded")).toBeTruthy();
    expect(screen.getByText("Missing")).toBeTruthy();
  });

  it("badge-cell применяет tone colorMap (inline style background)", () => {
    render(<DataGrid node={{ type: "dataGrid", items: apps, columns }} />);
    // "Degraded" → danger tone (bg: #fee2e2 = rgb(254, 226, 226))
    const degraded = screen.getByText("Degraded");
    const style = degraded.getAttribute("style") || "";
    // jsdom normalise'ит #hex в rgb()
    expect(style).toMatch(/rgb\(254,\s*226,\s*226\)|#fee2e2/i);
  });

  it("null/empty value → em-dash", () => {
    const rowsWithNull = [
      { id: "a1", name: "f", syncStatus: null },
      { id: "a2", name: "g", syncStatus: "" },
    ];
    const cols = [
      { key: "name", label: "Name" },
      { key: "syncStatus", label: "Sync", kind: "badge", colorMap: { Synced: "success" } },
    ];
    render(<DataGrid node={{ type: "dataGrid", items: rowsWithNull, columns: cols }} />);
    // 2 em-dashes в таблице (обе пустые строки syncStatus)
    const mutedCells = screen.getAllByText("—");
    expect(mutedCells.length).toBeGreaterThanOrEqual(2);
  });

  it("toneMap как alias для colorMap (backward-compat)", () => {
    const cols = [
      { key: "name", label: "Name" },
      { key: "syncStatus", label: "Sync", kind: "badge",
        toneMap: { Synced: "success", OutOfSync: "warning" } },
    ];
    render(<DataGrid node={{ type: "dataGrid", items: apps.slice(0,2), columns: cols }} />);
    expect(screen.getByText("Synced")).toBeTruthy();
    expect(screen.getByText("OutOfSync")).toBeTruthy();
  });

  it("unknown value без colorMap entry → default tone fallback (не crash)", () => {
    const cols = [
      { key: "name", label: "Name" },
      { key: "syncStatus", label: "Sync", kind: "badge",
        colorMap: { Synced: "success" } }, // нет OutOfSync / Unknown
    ];
    expect(() =>
      render(<DataGrid node={{ type: "dataGrid", items: apps, columns: cols }} />)
    ).not.toThrow();
    expect(screen.getByText("OutOfSync")).toBeTruthy();
  });
});
