import { describe, expect, it } from "vitest";
import { compareArchiveReports, extractArchiveDailyTotals } from "./archive-reconciliation";

const employeeGrid: unknown[][] = [
  [],
  ["", "اسم", "", "وظیفه", "تقسیم", "۱", "۲"],
  ["", "کارمند ۱", "", "", "عادي آرشیف", "۴", ""],
  ["", "کارمند ۱", "", "", "خدمات آرشیف", "۳", "۲"],
  ["", "کارمند ۲", "", "", "عادي آرشیف", "۱", "۲"],
];

const archiveGrid: unknown[][] = [
  [],
  ["", "", "", "اسم", "", "", "فعالیت", "۱", "۲"],
  ["", "", "", "کارمند ۱", "", "", "مثنی", "۲", "۱"],
  ["", "", "", "کارمند ۱", "", "", "تجدید", "۱", "۱"],
  ["", "", "", "کارمند ۱", "", "", "جدید", "۴", "۱"],
  ["", "", "", "کارمند ۱", "", "", "ثبت تولد", "۱", "۱"],
];

describe("archive reconciliation", () => {
  it("compares summed employee archive categories with matching archive activities by day", () => {
    const rows = compareArchiveReports(employeeGrid, archiveGrid, 1405, 1, { y: 1405, m: 1, d: 2 });
    expect(rows).toContainEqual(
      expect.objectContaining({
        day: 1,
        metric: "ordinary",
        employee: 5,
        archive: 5,
        delta: 0,
        status: "equal",
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        day: 1,
        metric: "service",
        employee: 3,
        archive: 3,
        delta: 0,
        status: "equal",
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        day: 2,
        metric: "ordinary",
        employee: null,
        archive: 2,
        delta: null,
        status: "missing",
      }),
    );
  });

  it("uses a combined technical category row instead of counting its subcategories again", () => {
    const combined: unknown[][] = [
      ...archiveGrid,
      ["", "", "", "کارمند ۱", "", "", "مثنی او تجدید مجموعه", "8", "8"],
    ];
    const totals = extractArchiveDailyTotals(combined, "archive");
    expect(totals.totals.service.get(1)?.value).toBe(8);
  });

  it("does not turn blank activity cells into zero", () => {
    const blank: unknown[][] = [
      ["", "اسم", "", "وظیفه", "تقسیم", "1"],
      ["", "کارمند ۱", "", "", "آرشیف خدمات", ""],
    ];
    expect(extractArchiveDailyTotals(blank, "employee").totals.service.get(1)?.value).toBeNull();
  });

  it("finds employee activity and day columns from their headers", () => {
    const shifted: unknown[][] = [
      ["شمېره", "نوم", "اسم", "څانګه", "دنده", "فعالیت", "۱", "۲"],
      ["1", "کارمند", "", "", "", "عادي", "7", "3"],
      ["2", "کارمند", "", "", "", "خدمات", "2", "1"],
      ["3", "کارمند", "", "", "", "توزیع عادي", "100", "100"],
    ];
    const totals = extractArchiveDailyTotals(shifted, "employee");
    expect(totals.headerRow).toBe(1);
    expect(totals.totals.ordinary.get(1)?.value).toBe(7);
    expect(totals.totals.service.get(1)?.value).toBe(2);
  });
});
