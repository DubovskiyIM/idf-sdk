// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import IllustratedEmptyState from "./IllustratedEmptyState.jsx";

afterEach(cleanup);

describe("IllustratedEmptyState (SDK)", () => {
  it("рендерит icon + title + description", () => {
    render(<IllustratedEmptyState icon="files" title="Нет файлов" description="Этот fileset пуст" />);
    expect(screen.getByText("Нет файлов")).toBeTruthy();
    expect(screen.getByText("Этот fileset пуст")).toBeTruthy();
    expect(screen.getByLabelText(/empty.*illustration/i)).toBeTruthy();
  });

  it("опциональная action-кнопка вызывает onAction", () => {
    const onAction = vi.fn();
    render(<IllustratedEmptyState icon="catalogs" title="Нет catalogs" actionLabel="+ Create" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onAction).toHaveBeenCalled();
  });

  it("неизвестный icon — fallback (no crash)", () => {
    render(<IllustratedEmptyState icon="weird" title="x" />);
    expect(screen.getByText("x")).toBeTruthy();
  });
});
