// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ColoredChip from "./ColoredChip.jsx";

afterEach(cleanup);

describe("ColoredChip", () => {
  it("рендерит text + applies color background", () => {
    render(<ColoredChip text="ALPHA" color="#0369a1" />);
    const el = screen.getByText("ALPHA");
    expect(el).toBeTruthy();
    // jsdom нормализует hex → rgb(); проверяем нормализованную форму.
    expect(el.style.background.toLowerCase()).toBe("rgb(3, 105, 161)");
  });

  it("kind=tag default styling (primary tone)", () => {
    render(<ColoredChip text="PII" kind="tag" />);
    expect(screen.getByText("PII")).toBeTruthy();
  });

  it("kind=policy styling (warning tone)", () => {
    render(<ColoredChip text="pii-mask" kind="policy" />);
    expect(screen.getByText("pii-mask")).toBeTruthy();
  });

  it("explicit color > kind preset", () => {
    render(<ColoredChip text="X" kind="tag" color="#FF3E1D" textColor="white" />);
    const el = screen.getByText("X");
    expect(el.style.background.toLowerCase()).toBe("rgb(255, 62, 29)");
    expect(el.style.color).toBeTruthy();
  });
});
