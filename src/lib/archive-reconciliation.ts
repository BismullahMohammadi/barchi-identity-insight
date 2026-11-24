import { isFridayJalali } from "./holidays";
import { columnName, reportNumber, reportText, type ReconciliationStatus } from "./reconciliation";
import { parseJalali, type JDate } from "./jalali";

export type ArchiveMetric = "ordinary" | "service";
export type ArchiveSourceKind = "employee" | "archive";

type ActivityRow = { label: string; cells: unknown[]; row: number };
type ActivityTotals = { value: number | null; rows: ActivityRow[] };
export type ArchiveDailyTotals = {
  headerRow: number | null;
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
    return (
      label.includes("آرشیف") &&
      (metric === "service" ? label.includes("خدمات") : /عادي|عادی/.test(label))
    );
  }
  return metric === "service"
    ? /مثن[یي]|تجدید/.test(label)
    : /(?:^|[\s/])جدید(?:$|[\s/])|ثبت\s*تولد/.test(label);
}

function sourceRows(grid: unknown[][], source: ArchiveSourceKind) {
  const headerRow = grid
    .slice(0, 10)
    .findIndex((row) =>
      source === "employee"
        ? reportText(row[1]).includes("اسم") &&
          reportText(row[4]).includes("تقسیم") &&
          reportNumber(row[5]).value === 1
        : reportText(row[3]) === "اسم" &&
          reportText(row[6]).includes("فعالیت") &&
          reportNumber(row[7]).value === 1,
    );
  const dayColumns = new Map<number, number>();
  const header = headerRow < 0 ? [] : (grid[headerRow] ?? []);
  const firstDayColumn = source === "employee" ? 5 : 7;
  header.forEach((value, column) => {
    const day = reportNumber(value).value;
    if (column >= firstDayColumn && day !== null && day >= 1 && day <= 31)
      dayColumns.set(day, column);
  });
  const activityColumn = source === "employee" ? 4 : 6;
  const rows: ActivityRow[] = [];
  if (headerRow >= 0) {
    for (let index = headerRow + 1; index < grid.length; index++) {
      const label = reportText(grid[index]?.[activityColumn]);
      if (label) rows.push({ label, cells: grid[index] ?? [], row: index + 1 });
    }
  }
  return { headerRow: headerRow < 0 ? null : headerRow + 1, dayColumns, rows };
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
): ArchiveDailyTotals {
  const parsed = sourceRows(grid, source);
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
  return { headerRow: parsed.headerRow, dayColumns: parsed.dayColumns, totals, matchedRows };
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
  const employee = extractArchiveDailyTotals(employeeGrid, "employee");
  const archive = extractArchiveDailyTotals(archiveGrid, "archive");
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
