import type { DashboardContext } from "./dashboard-permissions.server";
import { authorizedSheetHeaders } from "./sheets-access.server";
import {
  compareArchiveDailyTotals,
  extractArchiveDailyTotals,
  type ArchiveComparisonRow,
} from "./archive-reconciliation";
import { reportText } from "./reconciliation";
import { todayJalali } from "./jalali";

const BASE = "https://connector-gateway.lovable.dev/google_sheets/v4";
const ARCHIVE_SUMMARY_ID = "1W82u37NeQ4Og7rANME6i3jxj1aeCZhhvIj3YtmopQ2g";
const ARCHIVE_SUMMARY_GID = 2112350709;
const EMPLOYEE_REPORT_ID = "1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8";
const EMPLOYEE_REPORT_SUMMARY_TAB = "میاشتنۍ مجموعه";
type SheetMeta = { sheets?: { properties?: { title?: string; sheetId?: number } }[] };

async function readJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) {
    await response.text();
    console.error("Archive reconciliation source read failed", response.status);
    throw new Error("ARCHIVE_RECONCILIATION_SOURCE_READ_FAILED");
  }
  return response.json() as Promise<T>;
}

async function sourceGrid(
  spreadsheetId: string,
  sheet: { title: string; sheetId: number },
  headers: Record<string, string>,
): Promise<unknown[][]> {
  const range = `'${sheet.title.replace(/'/g, "''")}'!A1:AM500`;
  const result = await readJson<{ values?: unknown[][] }>(
    `${BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,
    headers,
  );
  return result.values ?? [];
}

async function spreadsheetMeta(
  spreadsheetId: string,
  headers: Record<string, string>,
): Promise<SheetMeta> {
  return readJson<SheetMeta>(
    `${BASE}/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId))`,
    headers,
  );
}

function monthSheets(metadata: SheetMeta) {
  return (metadata.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => typeof title === "string")
    .map((title) => {
      const properties = metadata.sheets?.find(
        (sheet) => sheet.properties?.title === title,
      )?.properties;
      return properties && typeof properties.sheetId === "number"
        ? { title, sheetId: properties.sheetId }
        : null;
    })
    .filter((sheet): sheet is { title: string; sheetId: number } => sheet !== null);
}

function sourceUrl(spreadsheetId: string, gid: number, cell: string | null): string | null {
  if (!cell) return null;
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}&range=${encodeURIComponent(cell)}`;
}

export async function readArchiveReconciliation(
  input: { year: number; month: number },
  context: DashboardContext,
) {
  const headers = await authorizedSheetHeaders(context, "reconciliation");
  const [archiveSummaryMeta, employeeReportMeta] = await Promise.all([
    spreadsheetMeta(ARCHIVE_SUMMARY_ID, headers),
    spreadsheetMeta(EMPLOYEE_REPORT_ID, headers),
  ]);
  const archiveSummarySheets = monthSheets(archiveSummaryMeta);
  const employeeReportSheets = monthSheets(employeeReportMeta);
  const employeeReportSheet = employeeReportSheets.find(
    (sheet) => reportText(sheet.title) === reportText(EMPLOYEE_REPORT_SUMMARY_TAB),
  );
  const archiveSummarySheet = archiveSummarySheets.find(
    (sheet) => sheet.sheetId === ARCHIVE_SUMMARY_GID,
  );
  if (!archiveSummarySheet || !employeeReportSheet) {
    throw new Error("ARCHIVE_RECONCILIATION_MONTH_MISSING");
  }

  const [archiveSummaryGrid, employeeReportGrid] = await Promise.all([
    sourceGrid(ARCHIVE_SUMMARY_ID, archiveSummarySheet, headers),
    sourceGrid(EMPLOYEE_REPORT_ID, employeeReportSheet, headers),
  ]);
  const archiveTotals = extractArchiveDailyTotals(
    archiveSummaryGrid,
    "archive-summary",
    input.year,
    input.month,
  );
  const employeeTotals = extractArchiveDailyTotals(
    employeeReportGrid,
    "employee-report",
    input.year,
    input.month,
  );
  const rows: ArchiveComparisonRow[] = compareArchiveDailyTotals(
    employeeTotals,
    archiveTotals,
    input.year,
    input.month,
    todayJalali(),
  ).map((row) => ({
    ...row,
    employeeUrl: sourceUrl(EMPLOYEE_REPORT_ID, employeeReportSheet.sheetId, row.employeeCell),
    archiveUrl: sourceUrl(ARCHIVE_SUMMARY_ID, archiveSummarySheet.sheetId, row.archiveCell),
  }));
  return {
    year: input.year,
    month: input.month,
    employeeTab: employeeReportSheet.title,
    archiveTab: archiveSummarySheet.title,
    sources: {
      employee: {
        headerFound: employeeTotals.headerRow !== null,
        monthFound: employeeTotals.monthFound,
        ordinaryActivities: employeeTotals.matchedRows.ordinary,
        serviceActivities: employeeTotals.matchedRows.service,
      },
      archive: {
        headerFound: archiveTotals.headerRow !== null,
        monthFound: archiveTotals.monthFound,
        ordinaryActivities: archiveTotals.matchedRows.ordinary,
        serviceActivities: archiveTotals.matchedRows.service,
      },
    },
    rows,
  };
}
