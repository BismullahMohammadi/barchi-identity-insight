import { describe, expect, it } from "vitest";
import { compareArchiveReports, extractArchiveDailyTotals } from "./archive-reconciliation";

const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
const archiveSummaryGrid: unknown[][] = [
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

const employeeReportGrid: unknown[][] = [
  ["گزارش ماه حمل"],
  ["فعالیت", ...days],
  ["جدید", "۴", "۱"],
  ["ثبت تولد", "۱", "۱"],
  ["مثنی", "۲", "۱"],
  ["تجدید", "۱", "۱"],
];

const employeeReportSummaryGrid: unknown[][] = [
  ["گزارش ماه حمل"],
  ["فعالیت", ...days],
  ["جدید او ثبت تولد", "90", ...Array(30).fill("0")],
  ["مثنی او تجدید", "80", ...Array(30).fill("0")],
  ["گزارش ماه قوس"],
  ["فعالیت", ...days],
  ["جدید او ثبت تولد", "124", "136", ...Array(29).fill("0")],
  ["مثنی او تجدید", "16", "15", ...Array(29).fill("0")],
];

const employeeReportStaffGrid: unknown[][] = [
  ["28", "فعالیت", "", "اسم", "ولد", "وظیفه", "نوعیت فعالیت", ...days],
  ["1", "", "", "کارمند ۱", "", "ثبت نام", "جدید او ثبت تولد", "4", "1"],
  ["2", "", "", "کارمند ۲", "", "ثبت نام", "جدید او ثبت تولد", "1", "1"],
  ["3", "", "", "کارمند ۱", "", "کنترول کیفیت", "مثنی او تجدید", "2", "1"],
  ["4", "", "", "کارمند ۲", "", "کنترول کیفیت", "مثنی او تجدید", "1", "1"],
];

describe("archive reconciliation", () => {
  it("compares the selected employee month block with archive activities by day", () => {
    const rows = compareArchiveReports(archiveSummaryGrid, employeeReportGrid, 1405, 1, {
      y: 1405,
      m: 1,
      d: 2,
    });
    expect(rows).toContainEqual(
      expect.objectContaining({
        day: 1,
        metric: "ordinary",
        employee: 5,
        archive: 4,
        delta: 1,
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
        employee: 2,
        archive: null,
        delta: null,
        status: "missing",
      }),
    );
    expect(rows.find((row) => row.day === 1 && row.metric === "ordinary")?.employee).not.toBe(100);
  });

  it("uses a combined technical category row instead of counting its subcategories again", () => {
    const combined: unknown[][] = [...employeeReportGrid, ["مثنی او تجدید مجموعه", "8", "8"]];
    const totals = extractArchiveDailyTotals(combined, "employee-report", 1405, 1);
    expect(totals.totals.service.get(1)?.value).toBe(8);
  });

  it("sums archive activities from the employee-detail monthly sheet format", () => {
    const totals = extractArchiveDailyTotals(employeeReportStaffGrid, "employee-report", 1405, 9);
    expect(totals.headerRow).toBe(1);
    expect(totals.matchedRows).toEqual({ ordinary: 2, service: 2 });
    expect(totals.totals.ordinary.get(1)?.value).toBe(5);
    expect(totals.totals.service.get(1)?.value).toBe(3);
  });

  it("uses only the selected month block from the monthly summary tab", () => {
    const totals = extractArchiveDailyTotals(employeeReportSummaryGrid, "employee-report", 1405, 9);
    expect(totals.monthFound).toBe(true);
    expect(totals.totals.ordinary.get(1)?.value).toBe(124);
    expect(totals.totals.service.get(1)?.value).toBe(16);
  });

  it("does not turn blank activity cells into zero", () => {
    const blank: unknown[][] = [
      ["برج", "نوع کار", "تاريخ", "مجموعه"],
      ["", "", "", ...days],
      ["حمل 1405", "آرشیف خدمات", "", ""],
    ];
    expect(
      extractArchiveDailyTotals(blank, "archive-summary", 1405, 1).totals.service.get(1)?.value,
    ).toBeNull();
  });
});
