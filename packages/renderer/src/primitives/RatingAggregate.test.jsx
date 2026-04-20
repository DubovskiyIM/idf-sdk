import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RatingAggregate from "./RatingAggregate.jsx";

afterEach(cleanup);

const SPEC = {
  type: "ratingAggregate",
  subEntity: "Review",
  fkField: "specialistId",
  ratingField: "rating",
  countLabel: "отзывов",
};

const SPECIALIST = { id: "s1", name: "Иван" };

describe("RatingAggregate primitive", () => {
  it("рендерит avg + count для specialist с reviews", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", rating: 5 },
          { id: "r2", specialistId: "s1", rating: 4 },
          { id: "r3", specialistId: "s1", rating: 5 },
          { id: "r4", specialistId: "s2", rating: 1 },   // другой specialist
        ],
      },
    };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("⭐");
    // 3 reviews для s1: 5, 4, 5 → avg 4.67, toFixed(1) → "4.7"
    expect(container.textContent).toContain("4.7");
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("отзыва");
  });

  it("declension: 1 → 'отзыв'", () => {
    const ctx = {
      world: {
        reviews: [{ id: "r1", specialistId: "s1", rating: 5 }],
      },
    };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("1 отзыв");
  });

  it("declension: 5 → 'отзывов'", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", rating: 4 },
          { id: "r2", specialistId: "s1", rating: 4 },
          { id: "r3", specialistId: "s1", rating: 5 },
          { id: "r4", specialistId: "s1", rating: 5 },
          { id: "r5", specialistId: "s1", rating: 3 },
        ],
      },
    };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("5 отзывов");
  });

  it("returns null при пустой подколлекции", () => {
    const ctx = { world: { reviews: [] } };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toBe("");
  });

  it("returns null без item.id", () => {
    const ctx = { world: { reviews: [{ specialistId: "s1", rating: 5 }] } };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={null} />);
    expect(container.textContent).toBe("");
  });

  it("игнорирует NaN/string ratings", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", rating: 5 },
          { id: "r2", specialistId: "s1", rating: "bad" },
          { id: "r3", specialistId: "s1", rating: null },
        ],
      },
    };
    const { container } = render(<RatingAggregate node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain("1 отзыв");
  });
});
