import type { DashboardContext } from './dashboard-permissions.server';
import { authorizedSheetHeaders } from './sheets-access.server';
import { compareMonthlyReports, compareSourceMonthlyTotals, findMonthlyBlock } from './reconciliation';
import { todayJalali } from './jalali';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const SOURCES = {
  local: { id: '1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs', tab: 'ریاست ته ګزارش' },
  province: { id: '1CQW-MelUxvRSGqbRMatozoVkrCZlhcgxluhBscsQM0Q', tab: 'مرکز دشت برچی' },
};
type Snapshot = { grid: unknown[][]; gid: number; fetchedAt: number };
type SourceError = { code: string; status: number | null; retryAt: number | null };
type Cached = { snapshot?: Snapshot; error?: SourceError; expires: number };
const cache = new Map<string, Cached>();
const pending = new Map<string, Promise<Cached>>();
let quotaRetryAt = 0;
class ReadError extends Error {
  constructor(public details: SourceError) { super(details.code); }
}
async function readJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (response.ok) return response.json() as Promise<T>;
    // Consume and discard provider bodies: they can contain source identifiers or data.
    await response.text();
    console.error('Reconciliation source read failed', response.status);
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After');
      const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.max(0, (Date.parse(retry) - Date.now()) / 1000) : 60;
      quotaRetryAt = Date.now() + Math.max(60000, Number.isFinite(seconds) ? seconds * 1000 : 60000);
      throw new ReadError({ code: 'rate_limited', status: 429, retryAt: quotaRetryAt });
    }
    if (response.status >= 500 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt + Math.random() * 250)); continue; }
    throw new ReadError({ code: 'source_error', status: response.status, retryAt: null });
  }
  throw new ReadError({ code: 'source_error', status: null, retryAt: null });
}
async function sourceSnapshot(source: keyof typeof SOURCES, userId: string, headers: Record<string, string>, refresh: boolean): Promise<Cached> {
  const key = `${userId}:${source}`, previous = cache.get(key);
  if (Date.now() < quotaRetryAt) return { ...previous, error: { code: 'rate_limited', status: 429, retryAt: quotaRetryAt }, expires: quotaRetryAt };
  // Even manual refresh has a minimum 30-second spacing; month switches reuse one snapshot.
  if (previous && Date.now() < previous.expires && (!refresh || previous.error || Date.now() - (previous.snapshot?.fetchedAt ?? 0) < 30000)) return previous;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const task = (async (): Promise<Cached> => {
    try {
      const config = SOURCES[source];
      const meta = await readJson<{ sheets?: { properties?: { title: string; sheetId: number } }[] }>(`${GATEWAY}/spreadsheets/${config.id}?fields=sheets(properties(title,sheetId))`, headers);
      const sheet = meta.sheets?.find(s => s.properties?.title === config.tab)?.properties;
      if (!sheet) throw new ReadError({ code: 'tab_missing', status: null, retryAt: null });
      const query = new URLSearchParams({ ranges: `'${config.tab}'!A1:AL800`, valueRenderOption: 'FORMATTED_VALUE', majorDimension: 'ROWS' });
      const data = await readJson<{ valueRanges?: { values?: unknown[][] }[] }>(`${GATEWAY}/spreadsheets/${config.id}/values:batchGet?${query}`, headers);
      return { snapshot: { grid: data.valueRanges?.[0]?.values ?? [], gid: sheet.sheetId, fetchedAt: Date.now() }, expires: Date.now() + 120000 };
    } catch (error) {
      const details: SourceError = error instanceof ReadError ? error.details : { code: 'network_error', status: null, retryAt: null };
      return { ...(previous?.snapshot ? { snapshot: previous.snapshot } : {}), error: details, expires: details.retryAt ?? Date.now() + 60000 };
    }
  })();
  pending.set(key, task);
  try {
    const result = await task;
    if (cache.size >= 8 && !cache.has(key)) { const first = cache.keys().next().value; if (first) cache.delete(first); }
    cache.set(key, result);
    return result;
  } finally { pending.delete(key); }
}
export async function readReconciliation(input: { year: number; month: number; refresh: boolean }, context: DashboardContext) {
  const headers = await authorizedSheetHeaders(context, "reconciliation"); // Always authorize before cache access.
  const today = todayJalali();
  const [local, province] = await Promise.all([sourceSnapshot('local', context.userId, headers, input.refresh), sourceSnapshot('province', context.userId, headers, input.refresh)]);
  const lb = findMonthlyBlock(local.snapshot?.grid ?? [], input.year, input.month, 'local', today.y);
  const pb = findMonthlyBlock(province.snapshot?.grid ?? [], input.year, input.month, 'province', today.y);
  const link = (source: keyof typeof SOURCES, snapshot: Snapshot | undefined, cell: string | null) => snapshot && cell ? `https://docs.google.com/spreadsheets/d/${SOURCES[source].id}/edit#gid=${snapshot.gid}&range=${cell}` : null;
  const rows = compareMonthlyReports(lb, pb, input.year, input.month, today).map(row => ({ ...row, localUrl: link('local', local.snapshot, row.localCell), provinceUrl: link('province', province.snapshot, row.provinceCell) }));
  const totals = compareSourceMonthlyTotals(lb, pb, input.year, input.month, today, { local: !!local.error, province: !!province.error }).map(row => ({ ...row, localUrl: link('local', local.snapshot, row.localCell), provinceUrl: link('province', province.snapshot, row.provinceCell) }));
  const diagnostic = (data: Cached, block: typeof lb) => ({ error: data.error ?? null, fetchedAt: data.snapshot?.fetchedAt ?? null, block: block.status, headingRow: block.headingRow, mapped: block.metrics.size, unmapped: block.unmapped, ambiguous: block.ambiguous.length, totalHeaderStatus: block.totalHeaderStatus });
  return { year: input.year, month: input.month, rows, totals, local: diagnostic(local, lb), province: diagnostic(province, pb), stale: !!local.error || !!province.error, checkedAt: Date.now() };
}