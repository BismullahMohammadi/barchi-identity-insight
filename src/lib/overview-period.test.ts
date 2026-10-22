import { describe, expect, it } from "vitest";
import { periodRange, periodRows, previousDayChange } from "./overview-period";
import type { NormalizedTable } from "./normalize";

const today = { y: 1405, m: 8, d: 1 };
const yesterday = { y: 1405, m: 7, d: 30 };
const table: NormalizedTable = {
  headers: ["نېټه", "شمېر"], rows: [["1405/07/30", 50], ["1405/08/01", 75]],
  dates: [yesterday, today], dateCol: 0, numericCols: [1], labelCol: 0,
};
describe("minimal overview period", () => {
  it("uses current month boundaries instead of prior month", () => {
    expect(periodRange("month", today)).toEqual({ from: { y: 1405, m: 8, d: 1 }, to: today });
    expect(periodRows(table, "month", today)).toEqual([["1405/08/01", 75]]);
  });
  it("keeps all rows for yearly totals", () => {
    expect(periodRows(table, "all", today)).toHaveLength(2);
  });
  it("computes real day-over-day percentage", () => {
    expect(previousDayChange(table, 1, today, yesterday)).toBe(50);
  });
  it("does not invent a delta if previous data are missing", () => {
    expect(previousDayChange({...table, dates: [null, today]}, 1, today, yesterday)).toBeNull();
  });
});
