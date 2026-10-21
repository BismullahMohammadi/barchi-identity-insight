import { jKey, parseJalali, toLatinDigits, type JDate } from "./jalali";
import { SHEET_COLUMNS, headerMatches } from "./sheet-columns";

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
export function normalizeGrid(grid: string[][], sheetTitle?: string): NormalizedTable {
  const mapping = sheetTitle ? SHEET_COLUMNS[sheetTitle] : undefined;
  if (mapping && sheetTitle === "ریاست ته ګزارش") return normalizeDirectorate(grid);
  if (mapping) return normalizeMapped(grid, mapping);
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

/** Deterministic mapping from the actual sheet's header row. */
function normalizeMapped(grid: string[][], config: import("./sheet-columns").SheetColumns): NormalizedTable {
  const header = grid[config.headerRow] ?? [];
  const width = Math.max(header.length, ...grid.map(r => r.length), 0);
  const headers = Array.from({length:width},(_,i)=>String(header[i] ?? "").trim() || `ستون ${i+1}`);
  // A source template might change: fail visibly instead of reporting incorrect totals.
  for (const [index, expected] of Object.entries(config.expectedHeaders)) {
    const n = Number(index);
    if (!headerMatches(headers[n] ?? "", expected)) {
      throw new Error(`SHEET_MAPPING_MISMATCH: ${expected}`);
    }
  }
  const metricCols = config.metricCols.filter(c => c < width);
  const candidate = grid.slice(config.headerRow+1);
  const body = candidate.filter(r=>{
    if (config.dateCol >= 0) return !!parseJalali(String(r[config.dateCol]??""));
    // Yearly summary has month names and quarter/subtotal rows; only known months.
    const label = String(r[config.labelCol]??"").trim();
    return !!label && ["حمل","ثور","جوزا","سرطان","سراطان","اسد","سنبله","میزان","عقرب","قوس","جدی","جدي","دلو","حوت"].includes(label);
  });
  const rows:Cell[][] = body.map(r=>Array.from({length:width},(_,c)=>{
    const value=String(r[c]??"").trim();
    if (!value) return null;
    if (metricCols.includes(c)) return parseNumber(value) ?? value;
    return value;
  }));
  const dates = rows.map(r=>config.dateCol>=0?parseJalali(String(r[config.dateCol]??"")):null);
  return { headers,rows,dates,dateCol:config.dateCol,numericCols:metricCols,labelCol:config.labelCol };
}
/** Row-oriented directorate report: services are rows, days are columns, total in AG.
 * Transpose to allow meaningful per-service comparison without adding totals twice.
 */
function normalizeDirectorate(grid:string[][]):NormalizedTable {
  const width = Math.max(0,...grid.map(r=>r.length));
  const headings = grid[0] ?? [];
  const totalCol = headings.findIndex(h=>String(h??"").trim()==="جمله");
  if (totalCol<1) throw new Error("SHEET_MAPPING_MISMATCH: جمله");
  const rows:Cell[][] = grid.slice(1).filter(r=>String(r[0]??"").trim()!=="")
    .map(r=>[String(r[0]??"").trim(),parseNumber(r[totalCol])??null]);
  return {headers:["بخشونه","مجموعه"],rows,dates:rows.map(()=>null),dateCol:-1,numericCols:[1],labelCol:0};
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
