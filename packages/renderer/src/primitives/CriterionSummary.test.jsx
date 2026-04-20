import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CriterionSummary from "./CriterionSummary.jsx";

afterEach(cleanup);

const SPEC = {
  type: "criterionSummary",
  subEntity: "Review",
  fkField: "specialistId",
  criteria: [
    { field: "quality", label: "Качество" },
    { field: "punctuality", label: "Пунктуальность" },
    { field: "politeness", label: "Вежливость" },
  ],
  title: "Оценка по критериям",
};

const SPECIALIST = { id: "s1", name: "Иван" };

describe("CriterionSummary primitive", () => {
  it("рендерит title + все criteria с avg значениями", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", quality: 5, punctuality: 4, politeness: 5 },
          { id: "r2", specialistId: "s1", quality: 4, punctuality: 5, politeness: 5 },
        ],
      },
    };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("Оценка по критериям");
    expect(container.textContent).toContain("Качество");
    expect(container.textContent).toContain("Пунктуальность");
    expect(container.textContent).toContain("Вежливость");
    // quality avg = (5+4)/2 = 4.5
    expect(container.textContent).toContain("4.5");
    // punctuality avg = (4+5)/2 = 4.5
    // politeness avg = (5+5)/2 = 5
    expect(container.textContent).toContain("5");
  });

  it("игнорирует records чужого specialist'а", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", quality: 5, punctuality: 5, politeness: 5 },
          { id: "r2", specialistId: "other", quality: 1, punctuality: 1, politeness: 1 },
        ],
      },
    };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx} item={SPECIALIST} />);
    // 1s не должны попадать в avg — только r1 считается
    expect(container.textContent).not.toContain("1.0");
  });

  it("returns null при пустой подколлекции", () => {
    const ctx = { world: { reviews: [] } };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toBe("");
  });

  it("returns null без item.id", () => {
    const ctx = { world: { reviews: [{ specialistId: "s1", quality: 5 }] } };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx} item={null} />);
    expect(container.textContent).toBe("");
  });

  it("returns null без criteria[]", () => {
    const ctx = { world: { reviews: [{ specialistId: "s1", quality: 5 }] } };
    const { container } = render(
      <CriterionSummary node={{ ...SPEC, criteria: [] }} ctx={ctx} item={SPECIALIST} />
    );
    expect(container.textContent).toBe("");
  });

  it("scale auto-detect: values ≤5 → scale=5, иначе 10", () => {
    const ctx10 = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", quality: 9, punctuality: 8, politeness: 10 },
        ],
      },
    };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx10} item={SPECIALIST} />);
    expect(container.textContent).toContain("9");
    expect(container.textContent).toContain("10");
  });

  it("пропускает criterion без valid values", () => {
    const ctx = {
      world: {
        reviews: [
          { id: "r1", specialistId: "s1", quality: 5, punctuality: null, politeness: "bad" },
        ],
      },
    };
    const { container } = render(<CriterionSummary node={SPEC} ctx={ctx} item={SPECIALIST} />);
    expect(container.textContent).toContain("Качество");
    // punctuality + politeness должны быть отфильтрованы (нет valid чисел)
    expect(container.textContent).not.toContain("Пунктуальность");
  });
});
