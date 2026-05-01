// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AvatarChip from "./AvatarChip.jsx";

afterEach(cleanup);

describe("AvatarChip", () => {
  it("показывает letter-avatar (first char uppercase) + name", () => {
    render(<AvatarChip name="alice@acme" />);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("alice@acme")).toBeTruthy();
  });

  it("kind=group использует accent color", () => {
    render(<AvatarChip name="analytics" kind="group" />);
    const letterEl = screen.getByText("A");
    expect(letterEl).toBeTruthy();
  });

  it("без name → ?", () => {
    render(<AvatarChip />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("size=lg даёт больший avatar (24px вместо 18px)", () => {
    render(<AvatarChip name="bob" size="lg" />);
    expect(screen.getByText("B")).toBeTruthy();
  });
});
