// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import Carousel from "./Carousel.jsx";
import SlotRenderer from "../SlotRenderer.jsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Carousel primitive (UI-gap #5)", () => {
  it("empty slides → не рендерится", () => {
    const { container } = render(<Carousel node={{ slides: [] }} ctx={{}} />);
    expect(container.textContent).toBe("");
  });

  it("один slide — рендерит title + subtitle, без индикатора", () => {
    const node = {
      type: "carousel",
      slides: [{ title: "Наши преимущества", subtitle: "Новое задание каждые 28 секунд" }],
    };
    const { getByText, container } = render(<Carousel node={node} ctx={{}} />);
    expect(getByText("Наши преимущества")).toBeTruthy();
    expect(getByText("Новое задание каждые 28 секунд")).toBeTruthy();
    expect(container.querySelector("[role='tablist']")).toBeNull();
  });

  it("eyebrow text рендерится как caption", () => {
    const node = {
      slides: [{ eyebrow: "Совет", title: "x" }],
    };
    const { getByText } = render(<Carousel node={node} ctx={{}} />);
    expect(getByText("Совет")).toBeTruthy();
  });

  it("illustration как URL → <img>", () => {
    const node = {
      slides: [{ title: "x", illustration: "/clock.svg" }],
    };
    const { container } = render(<Carousel node={node} ctx={{}} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("/clock.svg");
  });

  it("несколько slides — рендерит индикатор + первый slide active", () => {
    const node = {
      slides: [
        { title: "One" },
        { title: "Two" },
        { title: "Three" },
      ],
    };
    const { getAllByRole, getByText } = render(<Carousel node={node} ctx={{}} />);
    expect(getByText("One")).toBeTruthy();
    const tabs = getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
  });

  it("click на индикатор → переключает active slide", () => {
    const node = {
      autoplay: false,
      slides: [
        { title: "One" },
        { title: "Two" },
      ],
    };
    const { getAllByRole, getByText, queryByText } = render(<Carousel node={node} ctx={{}} />);
    fireEvent.click(getAllByRole("tab")[1]);
    expect(getByText("Two")).toBeTruthy();
    expect(queryByText("One")).toBeNull();
  });

  it("autoplay: timer двигает active через intervalMs", () => {
    vi.useFakeTimers();
    const node = {
      intervalMs: 1000,
      slides: [{ title: "One" }, { title: "Two" }],
    };
    const { queryByText } = render(<Carousel node={node} ctx={{}} />);
    expect(queryByText("One")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1001); });
    expect(queryByText("Two")).toBeTruthy();
  });

  it("autoplay:false — timer не запускается", () => {
    vi.useFakeTimers();
    const node = {
      autoplay: false,
      slides: [{ title: "One" }, { title: "Two" }],
    };
    const { queryByText } = render(<Carousel node={node} ctx={{}} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(queryByText("One")).toBeTruthy();
  });

  it("slide.render — произвольный SlotRenderer-node", () => {
    const node = {
      slides: [
        { render: { type: "text", content: "Custom inline" } },
      ],
    };
    const { getByText } = render(<Carousel node={node} ctx={{}} />);
    expect(getByText("Custom inline")).toBeTruthy();
  });
});

describe("SlotRenderer dispatch — carousel", () => {
  it("item.type='carousel' → Carousel primitive", () => {
    const item = {
      type: "carousel",
      slides: [{ title: "Hello" }],
    };
    const { getByText } = render(<SlotRenderer item={item} ctx={{}} />);
    expect(getByText("Hello")).toBeTruthy();
  });
});
