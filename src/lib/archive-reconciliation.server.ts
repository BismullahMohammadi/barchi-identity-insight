import type { DashboardContext } from "./dashboard-permissions.server";
import { authorizedSheetHeaders } from "./sheets-access.server";
import { MONTH_NAMES } from "./monthly-staff-completeness";
import {
  compareArchiveDailyTotals,
  extractArchiveDailyTotals,
  type ArchiveComparisonRow,
} from "./archive-reconciliation";
import { reportText } from "./reconciliation";
import { todayJalali, toLatinDigits } from "./jalali";

const BASE = "https://connector-gateway.lovable.dev/google_sheets/v4";
const EMPLOYEE_ID = "1W82u37NeQ4Og7rANME6i3jxj1aeCZhhvIj3YtmopQ2g";
const EMPLOYEE_GID = 2112350709;
const ARCHIVE_ID = "1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8";
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

function findArchiveMonth(titles: string[], month: number, year: number): string | null {
  const monthName = MONTH_NAMES[month];
  if (!monthName) return null;
  const candidates = titles.filter((title) => reportText(title).includes(reportText(monthName)));
  const matchingYear = candidates.filter((title) =>
    toLatinDigits(title)
      .match(/\b1[34]\d{2}\b/g)
      ?.includes(String(year)),
  );
  if (matchingYear.length === 1) return matchingYear[0] ?? null;
  if (matchingYear.length > 1) return null;
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
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
  const [employeeMeta, archiveMeta] = await Promise.all([
    spreadsheetMeta(EMPLOYEE_ID, headers),
    spreadsheetMeta(ARCHIVE_ID, headers),
  ]);
  const employeeSheets = monthSheets(employeeMeta);
  const archiveSheets = monthSheets(archiveMeta);
  const archiveTab = findArchiveMonth(
    archiveSheets.map((sheet) => sheet.title),
    input.month,
    input.year,
  );
  const employeeSheet = employeeSheets.find((sheet) => sheet.sheetId === EMPLOYEE_GID);
  const archiveSheet = archiveSheets.find((sheet) => sheet.title === archiveTab);
  if (!employeeSheet || !archiveSheet) throw new Error("ARCHIVE_RECONCILIATION_MONTH_MISSING");

  const [employeeGrid, archiveGrid] = await Promise.all([
    sourceGrid(EMPLOYEE_ID, employeeSheet, headers),
    sourceGrid(ARCHIVE_ID, archiveSheet, headers),
  ]);
  const employeeTotals = extractArchiveDailyTotals(
    employeeGrid,
    "employee",
    input.year,
    input.month,
  );
  const archiveTotals = extractArchiveDailyTotals(archiveGrid, "archive", input.year, input.month);
  const rows: ArchiveComparisonRow[] = compareArchiveDailyTotals(
    employeeTotals,
    archiveTotals,
    input.year,
    input.month,
    todayJalali(),
  ).map((row) => ({
    ...row,
    employeeUrl: sourceUrl(EMPLOYEE_ID, employeeSheet.sheetId, row.employeeCell),
    archiveUrl: sourceUrl(ARCHIVE_ID, archiveSheet.sheetId, row.archiveCell),
  }));
  return {
    year: input.year,
    month: input.month,
    employeeTab: employeeSheet.title,
    archiveTab: archiveSheet.title,
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
