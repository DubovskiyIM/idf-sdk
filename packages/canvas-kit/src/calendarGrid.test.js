import { describe, it, expect } from "vitest";
import { calendarGrid } from "./calendarGrid.js";

describe("calendarGrid", () => {
  it("generates cells for Apr 2026 (30 days in April)", () => {
    const cells = calendarGrid(new Date(2026, 3, 15));
    const aprilDays = cells.filter((c) => c.date.getMonth() === 3);
    expect(aprilDays).toHaveLength(30);
  });
  it("first row week=0, 7 days Mon..Sun", () => {
    const cells = calendarGrid(new Date(2026, 3, 15));
    const firstWeek = cells.filter((c) => c.week === 0);
    expect(firstWeek.length).toBe(7);
    expect(firstWeek[0].day).toBe(0);
    expect(firstWeek[6].day).toBe(6);
  });
  it("includes leading days of previous month", () => {
    const cells = calendarGrid(new Date(2026, 3, 15));
    expect(cells[0].date.getMonth()).not.toBe(3);
  });
  it("total cell count is multiple of 7", () => {
    const cells = calendarGrid(new Date(2026, 3, 15));
    expect(cells.length % 7).toBe(0);
  });
});
