import { isFridayJalali } from "./holidays";
import { columnName, reportNumber, reportText, type ReconciliationStatus } from "./reconciliation";
import { parseJalali, type JDate } from "./jalali";
import { MONTH_NAMES } from "./monthly-staff-completeness";

export type ArchiveMetric = "ordinary" | "service";
export type ArchiveSourceKind = "employee" | "archive";

type ActivityRow = { label: string; cells: unknown[]; row: number };
type ActivityTotals = { value: number | null; rows: ActivityRow[] };
export type ArchiveDailyTotals = {
  headerRow: number | null;
  monthFound: boolean;
  dayColumns: Map<number, number>;
  totals: Record<ArchiveMetric, Map<number, ActivityTotals>>;
  matchedRows: Record<ArchiveMetric, number>;
};
export type ArchiveComparisonRow = {
  day: number;
  metric: ArchiveMetric;
  label: string;
  employee: number | null;
  archive: number | null;
  delta: number | null;
  status: ReconciliationStatus;
  employeeCell: string | null;
  archiveCell: string | null;
  employeeUrl?: string | null;
  archiveUrl?: string | null;
};

const isCombinedActivity = (label: string, metric: ArchiveMetric) =>
  metric === "service"
    ? /مثن[یي].*تجدید|تجدید.*مثن[یي]/.test(label)
    : /(?:^|[\s/])جدید(?:$|[\s/]).*ثبت\s*تولد|ثبت\s*تولد.*(?:^|[\s/])جدید(?:$|[\s/])/.test(label);

function activityMatches(label: string, source: ArchiveSourceKind, metric: ArchiveMetric): boolean {
  if (source === "employee") {
    const archiveLabel = label.includes("آرشیف");
    return metric === "service"
      ? archiveLabel && label.includes("خدمات")
      : archiveLabel && /عادي|عادی/.test(label);
  }
  return metric === "service"
    ? /مثن[یي]|تجدید/.test(label)
    : /(?:^|[\s/])جدید(?:$|[\s/])|ثبت\s*تولد/.test(label);
}

function consecutiveDays(row: unknown[], minimumColumn: number): Map<number, number> {
  const firstDayColumn = row.findIndex(
    (value, column) => column >= minimumColumn && reportNumber(value).value === 1,
  );
  const days = new Map<number, number>();
  if (firstDayColumn < 0) return days;
  for (let column = firstDayColumn, day = 1; day <= 31; column++, day++) {
    if (reportNumber(row[column]).value !== day) break;
    days.set(day, column);
  }
  return days.size >= 28 ? days : new Map<number, number>();
}

function monthRows(
  grid: unknown[][],
  year: number,
  month: number,
): { start: number; end: number } | null {
  const monthName = MONTH_NAMES[month];
  if (!monthName) return null;
  const monthLabel = reportText(monthName);
  const matches = grid.flatMap((row, index) => {
    const title = reportText(row[0]);
    return title.includes(monthLabel) && title.includes(String(year)) ? [index] : [];
  });
  if (matches.length !== 1) return null;
  const start = matches[0];
  if (start === undefined) return null;
  const end = grid.findIndex((row, index) => {
    if (index <= start) return false;
    const title = reportText(row[0]);
    return (
      MONTH_NAMES.slice(1).some((name) => title.includes(reportText(name))) &&
      title.includes(String(year))
    );
  });
  return { start, end: end < 0 ? grid.length : end };
}

function sourceRows(grid: unknown[][], source: ArchiveSourceKind, year: number, month: number) {
  const labelHeaderIndex = grid
    .slice(0, 20)
    .findIndex((row) =>
      source === "employee"
        ? reportText(row[1]).includes("نوع کار")
        : reportText(row[0]).includes("فعالیت"),
    );
  const labelColumn = source === "employee" ? 1 : 0;
  const firstPossibleDayColumn = labelColumn + 1;
  let headerIndex = -1;
  let dayColumns = new Map<number, number>();
  if (labelHeaderIndex >= 0) {
    for (
      let index = labelHeaderIndex;
      index < Math.min(grid.length, labelHeaderIndex + 6);
      index++
    ) {
      const candidate = consecutiveDays(grid[index] ?? [], firstPossibleDayColumn);
      if (candidate.size) {
        headerIndex = index;
        dayColumns = candidate;
        break;
      }
    }
  }
  const selectedMonth = source === "employee" ? monthRows(grid, year, month) : null;
  const start =
    source === "employee"
      ? (selectedMonth?.start ?? grid.length)
      : headerIndex >= 0
        ? headerIndex + 1
        : grid.length;
  const end = source === "employee" ? (selectedMonth?.end ?? grid.length) : grid.length;
  const rows: ActivityRow[] = [];
  for (let index = start; index < end; index++) {
    const label = reportText(grid[index]?.[labelColumn]);
    if (label) rows.push({ label, cells: grid[index] ?? [], row: index + 1 });
  }
  return {
    headerRow: headerIndex < 0 ? null : headerIndex + 1,
    monthFound: source !== "employee" || selectedMonth !== null,
    dayColumns,
    rows,
  };
}

function categoryRows(rows: ActivityRow[], source: ArchiveSourceKind, metric: ArchiveMetric) {
  let matches = rows.filter((row) => activityMatches(row.label, source, metric));
  if (source === "archive") {
    const combined = matches.filter((row) => isCombinedActivity(row.label, metric));
    if (combined.length) matches = combined;
  }
  const detailed = matches.filter((row) => !/(?:مجموعه|مجموع|جمع کل|جمله)/.test(row.label));
  return detailed.length ? detailed : matches;
}

export function extractArchiveDailyTotals(
  grid: unknown[][],
  source: ArchiveSourceKind,
  year: number,
  month: number,
): ArchiveDailyTotals {
  const parsed = sourceRows(grid, source, year, month);
  const totals = {
    ordinary: new Map<number, ActivityTotals>(),
    service: new Map<number, ActivityTotals>(),
  };
  const matchedRows = { ordinary: 0, service: 0 };
  for (const metric of ["ordinary", "service"] as const) {
    const rows = categoryRows(parsed.rows, source, metric);
    matchedRows[metric] = rows.length;
    for (const day of parsed.dayColumns.keys()) {
      const values = rows.map((row) => ({
        row,
        value: reportNumber(row.cells[parsed.dayColumns.get(day)!]).value,
      }));
      totals[metric].set(day, {
        value:
          rows.length && values.every((item) => item.value !== null)
            ? values.reduce((sum, item) => sum + (item.value ?? 0), 0)
            : null,
        rows,
      });
    }
  }
  return {
    headerRow: parsed.headerRow,
    monthFound: parsed.monthFound,
    dayColumns: parsed.dayColumns,
    totals,
    matchedRows,
  };
}

function jalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return parseJalali(`${year}/12/30`) ? 30 : 29;
}

export function compareArchiveReports(
  employeeGrid: unknown[][],
  archiveGrid: unknown[][],
  year: number,
  month: number,
  today: JDate,
): ArchiveComparisonRow[] {
  const employee = extractArchiveDailyTotals(employeeGrid, "employee", year, month);
  const archive = extractArchiveDailyTotals(archiveGrid, "archive", year, month);
  return compareArchiveDailyTotals(employee, archive, year, month, today);
}

export function compareArchiveDailyTotals(
  employee: ArchiveDailyTotals,
  archive: ArchiveDailyTotals,
  year: number,
  month: number,
  today: JDate,
): ArchiveComparisonRow[] {
  const days = jalaliMonthDays(year, month);
  return (["ordinary", "service"] as const).flatMap((metric) => {
    const label =
      metric === "ordinary" ? "عادي آرشیف · جدید او ثبت تولد" : "خدمات آرشیف · مثنی او تجدید";
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const future =
        year > today.y ||
        (year === today.y && (month > today.m || (month === today.m && day > today.d)));
      const employeeValue = future ? null : (employee.totals[metric].get(day)?.value ?? null);
      const archiveValue = future ? null : (archive.totals[metric].get(day)?.value ?? null);
      const holiday = isFridayJalali({ y: year, m: month, d: day });
      const delta =
        employeeValue === null || archiveValue === null ? null : employeeValue - archiveValue;
      const employeeDayColumn = employee.dayColumns.get(day);
      const archiveDayColumn = archive.dayColumns.get(day);
      const employeeRows = employee.totals[metric].get(day)?.rows ?? [];
      const archiveRows = archive.totals[metric].get(day)?.rows ?? [];
      return {
        day,
        metric,
        label,
        employee: employeeValue,
        archive: archiveValue,
        delta,
        status:
          delta === null ? (holiday ? "holiday" : "missing") : delta === 0 ? "equal" : "mismatch",
        employeeCell:
          employeeDayColumn !== undefined && employeeRows.length
            ? `${columnName(employeeDayColumn)}${employeeRows[0]?.row}:${columnName(employeeDayColumn)}${employeeRows[employeeRows.length - 1]?.row}`
            : null,
        archiveCell:
          archiveDayColumn !== undefined && archiveRows.length
            ? `${columnName(archiveDayColumn)}${archiveRows[0]?.row}:${columnName(archiveDayColumn)}${archiveRows[archiveRows.length - 1]?.row}`
            : null,
      };
    });
  });
}
