import { JALALI_MONTHS, toLatinDigits, type JDate } from './jalali';
import { isFridayJalali } from './holidays';

export const metricDefinitions = [
  ['documents', 'چک اسناد', 'چک اسناد'],
  ['paper', 'مطابق تذکره کاغذی', 'مطابق تذکره کاغذی'],
  ['age', 'تعین سن', 'تعین سن|تعیین سن'],
  ['biometric', 'بایو متریک', 'بایو متریک|بایومتریک'],
  ['family', 'تصدیق فامیلی', 'تصدیق فامیلی'],
  ['demographic', 'دیموگرافی', 'دیموگرافی|دیموگرافي'],
  ['revenue', 'عواید', '^عواید'],
  ['quality', 'کنترل کیفیت', 'کنترل کیفیت|کنترول کیفیت'],
  ['archive', 'آرشیف', 'آرشیف'],
  ['scan', 'سکن', '^سکن'],
  ['distribution', 'توزیع عادی', 'توزیع عادی|توزیع روند عادی'],
  ['transfer', 'تذکره های انتقال', 'تذکره های انتقال'],
  ['serviceDistribution', 'توزیع خدمات', 'توزیع خدمات|توزیع تذکره های بخش خدمات'],
  ['renewal', 'خدمات بعد (مثنی / تجدید)', 'خدمات بعد.*مثنی'],
  ['correction', 'خدمات بعد (اصلاح روی کارت)', 'خدمات بعد.*اصلاح روی کارت'],
  ['serviceRevenue', 'عواید خدمات بعد از توزیع', '^عواید خدمات'],
  ['marriage', 'ثبت ازدواج', 'ثبت ازدواج'],
  ['divorce', 'ثبت طلاق', 'ثبت طلاق'],
  ['death', 'ثبت وفیات', 'ثبت وفیات'],
] as const;
export type ReconciliationStatus = 'mismatch' | 'equal' | 'missing' | 'holiday';
export type CellValue = { value: number | null; reason: 'blank' | 'holiday' | 'invalid' | null };
export function reportText(value: unknown): string {
  return toLatinDigits(String(value ?? '')).normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ـ\u200c-\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ').trim();
}
export function reportNumber(raw: unknown): CellValue {
  const text = reportText(raw);
  if (!text) return { value: null, reason: 'blank' };
  if (/جمعه|رخصت|تعطیل|friday/i.test(text.replace(/ /g, ''))) return { value: null, reason: 'holiday' };
  const number = text.replace(/(?:AFN|افغانۍ|افغانی|افغانیه|؋)/gi, '').replace(/[,٬\s]/g, '').replace(/٫/g, '.').replace(/−/g, '-');
  const value = /^[-+]?\d+(?:\.\d+)?$/.test(number) ? Number(number) : NaN;
  return Number.isFinite(value) ? { value, reason: null } : { value: null, reason: 'invalid' };
}
export function metricKey(label: unknown): string | null {
  const text = reportText(label);
  // Specific service revenue must win over ordinary revenue; never map by row position.
  const candidates = metricDefinitions.filter(([id,,pattern]) => new RegExp(pattern).test(text) && !(id === 'revenue' && /خدمات/.test(text)) && !(id === 'renewal' && /^عواید/.test(text)));
  return candidates.length === 1 ? candidates[0]?.[0] ?? null : null;
}
export function columnName(index: number): string {
  let n = index + 1, name = '';
  while (n > 0) { n--; name = String.fromCharCode(65 + n % 26) + name; n = Math.floor(n / 26); }
  return name;
}
export type ReportBlock = { status: 'available' | 'month_missing' | 'ambiguous_month' | 'day_header_missing'; headingRow: number | null; days: Map<number, number>; metrics: Map<string, { row: number; cells: unknown[] }>; unmapped: number; ambiguous: string[]; totalColumn: number | null; totalHeaderStatus: 'available' | 'missing' | 'ambiguous' };
export function findTotalColumn(headers: unknown[][], days: Map<number, number>): { totalColumn: number | null; totalHeaderStatus: ReportBlock['totalHeaderStatus'] } {
  if (!days.size) return { totalColumn: null, totalHeaderStatus: 'missing' };
  const lastDay = Math.max(...days.values());
  const candidates = new Set<number>();
  for (const row of headers) row.forEach((cell, col) => {
    // Only the adjacent end-of-row report area, not day cells or side tables.
    const label = reportText(cell);
    if (col > lastDay && col <= lastDay + 3 && /^(?:مجموعه|مجموع|جمله|جمع|جمع کل|مجموع کل|مجموعه کل|مجموع ماهانه|مجموعه ماهانه|مجموع ماه|مجموعه ماه|total|monthly total)$/i.test(label)) candidates.add(col);
  });
  return candidates.size === 1
    ? { totalColumn: candidates.values().next().value ?? null, totalHeaderStatus: 'available' }
    : { totalColumn: null, totalHeaderStatus: candidates.size ? 'ambiguous' : 'missing' };
}
export function findMonthlyBlock(grid: unknown[][], year: number, month: number, source: 'local' | 'province', currentYear: number): ReportBlock {
  const empty = (status: ReportBlock['status'], headingRow: number | null = null): ReportBlock => ({ status, headingRow, days: new Map(), metrics: new Map(), unmapped: 0, ambiguous: [], totalColumn: null, totalHeaderStatus: 'missing' });
  const monthName = JALALI_MONTHS[month - 1];
  if (!monthName) return empty('month_missing');
  const headings: number[] = [];
  grid.forEach((row, index) => {
    const text = reportText(row.join(' '));
    const isHeader = source === 'local' ? /بخشونه/.test(text) : /گزارش ماه/.test(text);
    const years = text.match(/1[34]\d{2}/g) ?? [];
    if (isHeader && text.includes(monthName) && (years.length ? years.some(y => Number(y) === year) : year === currentYear)) headings.push(index);
  });
  if (headings.length !== 1) return empty(headings.length ? 'ambiguous_month' : 'month_missing');
  const start = headings[0];
  if (start === undefined) return empty('month_missing');
  const block = empty('available', start + 1);
  const nextHeading = grid.findIndex((row, index) => index > start && /بخشونه|گزارش ماه/.test(reportText(row.join(' '))));
  const end = nextHeading < 0 ? grid.length : nextHeading;
  let dayRow = -1;
  for (let index = start; index < end; index++) {
    const days = new Map<number, number>();
    const duplicates = new Set<number>();
    (grid[index] ?? []).forEach((cell, col) => {
      const text = reportText(cell);
      if (!/^\d{1,2}$/.test(text)) return;
      const day = Number(text);
      if (day < 1 || day > 31) return;
      if (days.has(day)) duplicates.add(day); else days.set(day, col);
    });
    if (days.size >= 28 && !duplicates.size) { block.days = days; dayRow = index; break; }
  }
  if (dayRow < 0) return empty('day_header_missing', start + 1);
  Object.assign(block, findTotalColumn(grid.slice(start, dayRow + 1), block.days));
  const firstDayCol = Math.min(...block.days.values());
  for (let index = dayRow + 1; index < end; index++) {
    const cells = grid[index] ?? [];
    // Province activity and subtype live in C:E; ignore staff count and serial number.
    const label = source === 'local' ? cells[0] : cells.slice(2, Math.min(5, firstDayCol)).map(reportText).filter(Boolean).join(' ');
    if (!reportText(label)) continue;
    const key = metricKey(label);
    if (!key) { block.unmapped++; continue; }
    if (block.metrics.has(key) || block.ambiguous.includes(key)) { block.metrics.delete(key); block.ambiguous.push(key); continue; }
    block.metrics.set(key, { row: index + 1, cells });
  }
  return block;
}
export type ReconciliationRow = { day: number; metric: string; label: string; local: number | null; province: number | null; delta: number | null; status: ReconciliationStatus; holiday: boolean; reason: string | null; localCell: string | null; provinceCell: string | null; localUrl?: string | null; provinceUrl?: string | null };
export function compareMonthlyReports(local: ReportBlock, province: ReportBlock, year: number, month: number, today: JDate): ReconciliationRow[] {
  const days = month <= 6 ? 31 : month <= 11 ? 30 : new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year + 622, 2, 20))) === '1' ? 29 : 30;
  const rows: ReconciliationRow[] = [];
  for (let day = 1; day <= days; day++) {
    const holiday = isFridayJalali({ y: year, m: month, d: day });
    const future = year > today.y || (year === today.y && (month > today.m || (month === today.m && day > today.d)));
    for (const [metric, label] of metricDefinitions) {
      const l = local.metrics.get(metric), p = province.metrics.get(metric), lc = local.days.get(day), pc = province.days.get(day);
      const lv = reportNumber(l && lc !== undefined ? l.cells[lc] : null), pv = reportNumber(p && pc !== undefined ? p.cells[pc] : null);
      const reason = future ? 'future' : !l || !p ? 'metric_missing' : lc === undefined || pc === undefined ? 'day_missing' : holiday || lv.reason === 'holiday' || pv.reason === 'holiday' ? 'holiday' : lv.reason || pv.reason;
      const comparable = !reason && lv.value !== null && pv.value !== null;
      const delta = comparable ? Math.round(((lv.value ?? 0) - (pv.value ?? 0)) * 100) / 100 : null;
      rows.push({ day, metric, label, local: lv.value, province: pv.value, delta, status: holiday && delta === null ? 'holiday' : delta === null ? 'missing' : delta === 0 ? 'equal' : 'mismatch', holiday, reason, localCell: l && lc !== undefined ? `${columnName(lc)}${l.row}` : null, provinceCell: p && pc !== undefined ? `${columnName(pc)}${p.row}` : null });
    }
  }
  return rows;
}

export type MonthlyTotalRow = Omit<ReconciliationRow, 'day' | 'holiday'>;
export function compareSourceMonthlyTotals(local: ReportBlock, province: ReportBlock, year: number, month: number, today: JDate, errors: { local: boolean; province: boolean } = { local: false, province: false }): MonthlyTotalRow[] {
  const future = year > today.y || (year === today.y && month > today.m);
  return metricDefinitions.map(([metric, label]) => {
    const l = local.metrics.get(metric), p = province.metrics.get(metric);
    const lc = local.totalColumn, pc = province.totalColumn;
    const lv = reportNumber(!errors.local && !future && local.status === 'available' && l && lc !== null ? l.cells[lc] : null);
    const pv = reportNumber(!errors.province && !future && province.status === 'available' && p && pc !== null ? p.cells[pc] : null);
    const reason = future ? 'future' : errors.local || errors.province ? 'source_error' : !l || !p ? 'metric_missing' : lc === null || pc === null ? 'total_header_' + (local.totalHeaderStatus === 'ambiguous' || province.totalHeaderStatus === 'ambiguous' ? 'ambiguous' : 'missing') : lv.reason || pv.reason;
    const delta = !reason && lv.value !== null && pv.value !== null ? Math.round((lv.value - pv.value) * 100) / 100 : null;
    return { metric, label, local: lv.value, province: pv.value, delta, status: delta === null ? 'missing' : delta === 0 ? 'equal' : 'mismatch', reason, localCell: l && lc !== null ? `${columnName(lc)}${l.row}` : null, provinceCell: p && pc !== null ? `${columnName(pc)}${p.row}` : null };
  });
}