import { describe, expect, it } from "vitest";
import { compareArchiveReports, extractArchiveDailyTotals } from "./archive-reconciliation";

const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
const employeeGrid: unknown[][] = [
  [
    "برج",
    "نوع کار",
    "تاريخ",
    "د ورځو شمېرې",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "مجموعه راپورونه",
  ],
  ["", "", "", ...days, ""],
  ["حمل 1405", "آرشیف عادي", "", "۴", "", ...Array(29).fill("")],
  ["", "آرشیف خدمات", "", "۳", "۲", ...Array(28).fill("")],
  ["ثور 1405", "آرشیف عادي", "", "100", ...Array(30).fill("")],
  ["", "آرشیف خدمات", "", "200", ...Array(30).fill("")],
];

const archiveGrid: unknown[][] = [
  ["گزارش ماه حمل"],
  ["فعالیت", ...days],
  ["جدید", "۴", "۱"],
  ["ثبت تولد", "۱", "۱"],
  ["مثنی", "۲", "۱"],
  ["تجدید", "۱", "۱"],
];

const archiveStaffGrid: unknown[][] = [
  ["28", "فعالیت", "", "اسم", "ولد", "وظیفه", "نوعیت فعالیت", ...days],
  ["1", "", "", "کارمند ۱", "", "ثبت نام", "جدید او ثبت تولد", "4", "1"],
  ["2", "", "", "کارمند ۲", "", "ثبت نام", "جدید او ثبت تولد", "1", "1"],
  ["3", "", "", "کارمند ۱", "", "کنترول کیفیت", "مثنی او تجدید", "2", "1"],
  ["4", "", "", "کارمند ۲", "", "کنترول کیفیت", "مثنی او تجدید", "1", "1"],
];

describe("archive reconciliation", () => {
  it("compares the selected employee month block with archive activities by day", () => {
    const rows = compareArchiveReports(employeeGrid, archiveGrid, 1405, 1, {
      y: 1405,
      m: 1,
      d: 2,
    });
    expect(rows).toContainEqual(
      expect.objectContaining({
        day: 1,
        metric: "ordinary",
        employee: 4,
        archive: 5,
        delta: -1,
        status: "mismatch",
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
    expect(rows.find((row) => row.day === 1 && row.metric === "ordinary")?.employee).not.toBe(100);
  });

  it("uses a combined technical category row instead of counting its subcategories again", () => {
    const combined: unknown[][] = [...archiveGrid, ["مثنی او تجدید مجموعه", "8", "8"]];
    const totals = extractArchiveDailyTotals(combined, "archive", 1405, 1);
    expect(totals.totals.service.get(1)?.value).toBe(8);
  });

  it("sums archive activities from the employee-detail monthly sheet format", () => {
    const totals = extractArchiveDailyTotals(archiveStaffGrid, "archive", 1405, 9);
    expect(totals.headerRow).toBe(1);
    expect(totals.matchedRows).toEqual({ ordinary: 2, service: 2 });
    expect(totals.totals.ordinary.get(1)?.value).toBe(5);
    expect(totals.totals.service.get(1)?.value).toBe(3);
  });

  it("does not turn blank activity cells into zero", () => {
    const blank: unknown[][] = [
      ["برج", "نوع کار", "تاريخ", "مجموعه"],
      ["", "", "", ...days],
      ["حمل 1405", "آرشیف خدمات", "", ""],
    ];
    expect(
      extractArchiveDailyTotals(blank, "employee", 1405, 1).totals.service.get(1)?.value,
    ).toBeNull();
  });
});
