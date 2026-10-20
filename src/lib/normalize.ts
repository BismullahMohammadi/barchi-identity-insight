import { jKey, parseJalali, toLatinDigits, type JDate } from "./jalali";

export type Cell = string | number | null;
export type NormalizedTable = {
  headers: string[];
  rows: Cell[][];
  dates: (JDate | null)[]; // per row
  dateCol: number;
  numericCols: number[];
  labelCol: number;
};

export function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  let s = toLatinDigits(String(raw)).trim();
  if (!s) return null;
  s = s.replace(/[٬,\s]/g, "").replace(/٫/g, ".").replace(/(افغانۍ|افغانی|AFN|؋|%)/gi, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const TOTAL_RE = /(مجموع|ټول|جمع|total)/i;

export function isTotalRow(row: Cell[]): boolean {
  return row.some((c) => typeof c === "string" && TOTAL_RE.test(c));
}

/** Turn a raw sheet grid into a typed table: detect header, date column, numeric columns. */
export function normalizeGrid(grid: string[][]): NormalizedTable {
  const width = Math.max(0, ...grid.map((r) => r.length));
  const filled = (r: string[]) => r.filter((c) => String(c ?? "").trim() !== "").length;

  // Header: within the first 10 rows, the row with the most non-numeric text cells.
  let headerIdx = 0;
  let best = -1;
  for (let i = 0; i < Math.min(10, grid.length); i++) {
    const r = grid[i] ?? [];
    const score = r.filter((c) => String(c ?? "").trim() && parseNumber(c) === null && !parseJalali(c)).length;
    if (score > best) { best = score; headerIdx = i; }
  }
  const headerRow = grid[headerIdx] ?? [];
  const headers = Array.from({ length: width }, (_, i) => String(headerRow[i] ?? "").trim() || `ستون ${i + 1}`);

  const body = grid.slice(headerIdx + 1).filter((r) => filled(r) > 0);

  // Column typing.
  const numericCols: number[] = [];
  let dateCol = -1;
  let dateHits = 0;
  for (let c = 0; c < width; c++) {
    const vals = body.map((r) => String(r[c] ?? "").trim()).filter(Boolean);
    if (!vals.length) continue;
    const dHits = vals.filter((v) => parseJalali(v)).length;
    if (dHits / vals.length >= 0.6 && dHits > dateHits) { dateCol = c; dateHits = dHits; continue; }
    const nHits = vals.filter((v) => parseNumber(v) !== null).length;
    if (nHits / vals.length >= 0.6) numericCols.push(c);
  }
  const finalNumeric = numericCols.filter((c) => c !== dateCol);
  let labelCol = dateCol;
  if (labelCol < 0) {
    labelCol = headers.findIndex((_, i) => !finalNumeric.includes(i) && body.some((r) => String(r[i] ?? "").trim()));
  }

  const rows: Cell[][] = body.map((r) =>
    Array.from({ length: width }, (_, c) => {
      const v = String(r[c] ?? "").trim();
      if (!v) return null;
      if (finalNumeric.includes(c)) return parseNumber(v) ?? v;
      return v;
    }),
  );
  const dates = rows.map((r) => (dateCol >= 0 && r[dateCol] != null ? parseJalali(String(r[dateCol])) : null));

  return { headers, rows, dates, dateCol, numericCols: finalNumeric, labelCol: Math.max(0, labelCol) };
}

export type DateFilter = { from: JDate | null; to: JDate | null };

export function filterByDate(t: NormalizedTable, f: DateFilter): { rows: Cell[][]; dates: (JDate | null)[] } {
  if (t.dateCol < 0 || (!f.from && !f.to)) return { rows: t.rows, dates: t.dates };
  const rows: Cell[][] = [];
  const dates: (JDate | null)[] = [];
  t.rows.forEach((r, i) => {
    const d = t.dates[i];
    if (!d) return;
    if (f.from && jKey(d) < jKey(f.from)) return;
    if (f.to && jKey(d) > jKey(f.to)) return;
    rows.push(r);
    dates.push(d);
  });
  return { rows, dates };
}

export function sumColumn(rows: Cell[][], col: number): number {
  return rows.filter((r) => !isTotalRow(r)).reduce((a, r) => a + (typeof r[col] === "number" ? (r[col] as number) : 0), 0);
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
