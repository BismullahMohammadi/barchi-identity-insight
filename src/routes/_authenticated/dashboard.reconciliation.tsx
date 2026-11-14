import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { ArrowDownUp, CheckCheck, ExternalLink, RefreshCw, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReconciliation } from '@/lib/reconciliation.functions';
import { JALALI_MONTHS, nowJalaliTime, todayJalali } from '@/lib/jalali';
import { metricDefinitions, type ReconciliationRow, type ReconciliationStatus } from '@/lib/reconciliation';

const searchSchema = z.object({ year: z.coerce.number().int().min(1300).max(1499).optional(), month: z.coerce.number().int().min(1).max(12).optional(), status: z.enum(['all', 'mismatch', 'equal', 'missing']).default('all'), metric: z.string().default('all'), day: z.coerce.number().int().min(1).max(31).optional(), sort: z.enum(['day', 'metric', 'delta', 'status']).default('day'), desc: z.boolean().default(false) });
const reportQuery = (year: number, month: number) => queryOptions({ queryKey: ['reconciliation', year, month], queryFn: () => getReconciliation({ data: { year, month } }), staleTime: 120000, retry: false, refetchOnWindowFocus: false });
const labels: Record<ReconciliationStatus, string> = { mismatch: 'توپیر', equal: 'برابر', missing: 'ناشته / نامعلوم' };
const tones: Record<ReconciliationStatus, string> = { mismatch: 'border-destructive/30 bg-destructive/10 text-destructive', equal: 'border-success/30 bg-success/10 text-foreground', missing: 'border-warning/40 bg-warning/15 text-foreground' };
const reasonLabels: Record<string, string> = { holiday: 'جمعه / رخصتي', future: 'راتلونکې ورځ', blank: 'خالي خانه', invalid: 'د خانې نامعتبر ارزښت', metric_missing: 'د برخې معلومات نشته', day_missing: 'د ورځې کالم نشته' };

export const Route = createFileRoute('/_authenticated/dashboard/reconciliation')({
  validateSearch: (input) => searchSchema.parse(input),
  loaderDeps: ({ search }) => ({ year: search.year, month: search.month }),
  loader: ({ context, deps }) => {
    const today = todayJalali();
    return context.queryClient.ensureQueryData(reportQuery(deps.year ?? today.y, deps.month ?? today.m));
  },
  head: () => ({ meta: [
    { title: 'د راپورونو مطابقت — Barchi Identity Insight' },
    { name: 'description', content: 'د مرکز او ولایت د میاشتنیو راپورونو خوندي، یوازې لوستونکی مطابقت.' },
    { property: 'og:title', content: 'د راپورونو مطابقت — Barchi Identity Insight' },
    { property: 'og:description', content: 'د جلالي ورځې او برخې له مخې د راپورونو مطابقت.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  pendingComponent: () => <p role="status" className="py-12 text-muted-foreground">د راپورونو شمېرې لوستل کېږي…</p>,
  errorComponent: () => <ReportUnavailable />,
  notFoundComponent: () => <p>د مطابقت راپور نه دی موندل شوی.</p>,
  component: ReconciliationPage,
});

function ReportUnavailable() {
  const navigate = Route.useNavigate();
  return <div role="alert" className="space-y-4 py-8"><h1 className="text-xl font-bold">د راپورونو لوستلو ستونزه</h1><p>لاسرسی یا اړیکه اوس نه شي تاییدېدای؛ هېڅ شمېرې نه دي اټکل شوې.</p><Button onClick={() => navigate({ to: '/dashboard' })}>ډشبورډ</Button></div>;
}

function ReconciliationPage() {
  const search = Route.useSearch(), navigate = Route.useNavigate();
  const today = todayJalali(), year = search.year ?? today.y, month = search.month ?? today.m;
  const query = useSuspenseQuery(reportQuery(year, month)), data = query.data;
  const fetchReport = useServerFn(getReconciliation), client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false), [refreshFailed, setRefreshFailed] = useState(false);
  const update = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: prev => ({ ...prev, ...patch }) });
  const counts = { mismatch: 0, equal: 0, missing: 0 };
  data.rows.forEach(row => counts[row.status]++);
  const rows = data.rows.filter(row => (search.status === 'all' || row.status === search.status) && (search.metric === 'all' || row.metric === search.metric) && (!search.day || row.day === search.day));
  rows.sort((a, b) => {
    const delta = search.sort === 'metric' ? a.label.localeCompare(b.label, 'fa') : search.sort === 'status' ? a.status.localeCompare(b.status) : search.sort === 'delta' ? (Math.abs(a.delta ?? -1) - Math.abs(b.delta ?? -1)) : a.day - b.day;
    return (search.desc ? -delta : delta) || a.day - b.day || a.label.localeCompare(b.label, 'fa');
  });
  const retryAt = Math.max(data.local.error?.retryAt ?? 0, data.province.error?.retryAt ?? 0);
  async function refresh() {
    setRefreshing(true); setRefreshFailed(false);
    try { const next = await fetchReport({ data: { year, month, refresh: true } }); client.setQueryData(reportQuery(year, month).queryKey, next); }
    catch { setRefreshFailed(true); }
    finally { setRefreshing(false); }
  }
  const diagnostic = (source: typeof data.local, title: string) => {
    const error = source.error;
    const message = error?.code === 'rate_limited' ? 'ګوګل ډېرې غوښتنې ترلاسه کړې (429).' : error ? `د سرچینې لوستل ناکام شول${error.status ? ` (${error.status})` : ''}.` : source.block === 'month_missing' ? 'د ټاکلې میاشتې برخه نشته.' : source.block === 'ambiguous_month' ? 'د میاشتې تکراري سرلیک؛ مطابقت نامعلوم دی.' : source.block === 'day_header_missing' ? 'د ورځو سرلیک نه دی موندل شوی.' : source.ambiguous || source.unmapped ? `نامعلومې برخې: ${source.unmapped}؛ تکراري برخې: ${source.ambiguous}.` : null;
    return <div className="space-y-1"><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{source.fetchedAt ? nowJalaliTime(source.fetchedAt) : 'لا نه دی لوستل شوی'} · {source.mapped} برخې</p>{message && <p className="text-sm">{message}</p>}</div>;
  };
  const number = (value: number | null) => value === null ? '—' : value.toLocaleString('fa-AF', { maximumFractionDigits: 2 });
  const filteredMetrics = metricDefinitions.filter(([key]) => search.metric === 'all' || search.metric === key);
  const daily = Array.from(new Set(data.rows.map(r => r.day))).filter(day => !search.day || day === search.day);
  const cells = new Map(data.rows.map(row => [`${row.metric}:${row.day}`, row]));
  return <div dir="rtl" className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Scale aria-hidden="true" className="h-6 w-6 text-primary" />د راپورونو مطابقت</h1><p className="mt-2 text-sm text-muted-foreground">د مرکز راپور ↔ د ولایت راپور · {JALALI_MONTHS[month - 1]} {year} هـ ش</p></div>
      <Button variant="outline" className="min-h-11 gap-2" disabled={refreshing || query.isFetching || Date.now() < retryAt} onClick={refresh}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />تازه کول</Button>
    </div>
    {(data.stale || refreshFailed) && <div role="alert" className="flex gap-3 border-s-4 border-warning bg-warning/10 p-4"><AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" /><div><p>تازه لوستل ناکام شول؛ پخوانۍ شمېرې که موجودې وي، تازه تایید شوې نه دي.</p>{retryAt > 0 && <p className="mt-1 text-sm">بیا هڅه: {nowJalaliTime(retryAt)}. د انتظار تر پای تازه کول بند دي.</p>}</div></div>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm"><span className="block">میاشت</span><select aria-label="میاشت" className="min-h-11 rounded-lg border bg-card px-3" value={month} onChange={event => update({ month: Number(event.target.value), year, day: undefined })}>{JALALI_MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      <label className="space-y-1 text-sm"><span className="block">کال</span><select aria-label="کال" className="min-h-11 rounded-lg border bg-card px-3" value={year} onChange={event => update({ year: Number(event.target.value), month, day: undefined })}>{Array.from(new Set([today.y - 2, today.y - 1, today.y, year])).sort().map(y => <option key={y}>{y}</option>)}</select></label>
      <label className="min-w-0 space-y-1 text-sm"><span className="block">برخه</span><select aria-label="برخه" className="min-h-11 max-w-full rounded-lg border bg-card px-3" value={search.metric} onChange={event => update({ metric: event.target.value })}><option value="all">ټولې برخې</option>{metricDefinitions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="space-y-1 text-sm"><span className="block">ورځ</span><select aria-label="ورځ" className="min-h-11 rounded-lg border bg-card px-3" value={search.day ?? ''} onChange={e => update({ day: e.target.value ? Number(e.target.value) : undefined })}><option value="">ټولې ورځې</option>{Array.from(new Set(data.rows.map(r => r.day))).map(day => <option key={day}>{day}</option>)}</select></label>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(['mismatch', 'equal', 'missing'] as const).map(status => <Button key={status} variant="outline" aria-pressed={search.status === status} onClick={() => update({ status: search.status === status ? 'all' : status })} className={`h-auto min-h-24 justify-between whitespace-normal rounded-lg border px-5 py-4 ${tones[status]}`}><span className="text-start">{status === 'equal' && <CheckCheck aria-hidden="true" className="mb-1 h-5 w-5" />}{labels[status]}</span><span className="text-3xl font-bold">{number(counts[status])}</span></Button>)}</div>
    <div className="flex flex-wrap items-center gap-2" aria-label="د حالت چاڼ"><Button variant={search.status === 'all' ? 'default' : 'outline'} onClick={() => update({ status: 'all', day: undefined })}>ټول حالتونه</Button>{(['mismatch', 'equal', 'missing'] as const).map(status => <Button key={status} variant={search.status === status ? 'default' : 'outline'} onClick={() => update({ status })}>{labels[status]}</Button>)}</div>
    <div className="grid gap-4 border-y py-4 sm:grid-cols-2">{diagnostic(data.local, 'د مرکز سرچینه')}{diagnostic(data.province, 'د ولایت سرچینه')}</div>
    <section aria-labelledby="discrepancy-title" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="discrepancy-title" className="text-lg font-bold">د ورځو او برخو پایلې <span className="text-sm font-normal text-muted-foreground">({number(rows.length)})</span></h2><div className="flex items-center gap-2"><select aria-label="ترتیب" className="min-h-11 rounded-lg border bg-card px-3" value={search.sort} onChange={e => update({ sort: e.target.value as typeof search.sort })}><option value="day">ورځ</option><option value="metric">برخه</option><option value="delta">د توپیر اندازه</option><option value="status">حالت</option></select><Button size="icon" variant="outline" title="د ترتیب لوری" aria-label="د ترتیب لوری" onClick={() => update({ desc: !search.desc })}><ArrowDownUp className="h-4 w-4" /></Button></div></div>
      <div className="max-h-[640px] overflow-auto border"><table className="w-full text-right text-sm"><thead className="sticky top-0 z-10"><tr>{['ورځ', 'برخه', 'مرکز', 'ولایت', 'توپیر (مرکز − ولایت)', 'حالت', 'سرچینې'].map(label => <th key={label} className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={`${row.metric}:${row.day}`} className="border-t hover:bg-muted/50"><td className="whitespace-nowrap px-3 py-3">{year}/{String(month).padStart(2, '0')}/{String(row.day).padStart(2, '0')}</td><th scope="row" className="min-w-40 px-3 py-3 font-medium">{row.label}</th><td className="px-3 py-3 tabular-nums">{number(row.local)}</td><td className="px-3 py-3 tabular-nums">{number(row.province)}</td><td dir="ltr" className="px-3 py-3 text-right tabular-nums">{number(row.delta)}</td><td className="min-w-32 px-3 py-3"><span className={`inline-block rounded border px-2 py-1 ${tones[row.status]}`}>{labels[row.status]}</span>{row.reason && <p className="mt-1 text-xs text-muted-foreground">{reasonLabels[row.reason]}</p>}</td><td className="px-3 py-3"><div className="flex gap-2"><SourceLink row={row} source="local" /><SourceLink row={row} source="province" /></div></td></tr>)}</tbody></table>{!rows.length && <p role="status" className="p-8 text-center text-muted-foreground">د ټاکل شوي چاڼ پایلې نشته.</p>}</div>
    </section>
    <section aria-labelledby="grid-title" className="space-y-3"><h2 id="grid-title" className="text-lg font-bold">د برخو او ورځو مطابقت</h2><div className="overflow-auto border"><table className="w-full text-sm"><thead><tr><th className="min-w-48 px-3 py-3 text-start">برخه</th>{daily.map(day => <th key={day} className="min-w-11 p-1">{day}</th>)}</tr></thead><tbody>{filteredMetrics.map(([key, label]) => <tr key={key} className="border-t"><th scope="row" className="whitespace-nowrap px-3 py-2 text-start font-medium">{label}</th>{daily.map(day => { const row = cells.get(`${key}:${day}`); if (!row) return <td key={day} />; return <td key={day} className="p-1"><Button variant="outline" size="icon" className={`h-9 w-9 rounded ${tones[row.status]}`} aria-label={`${label}، ورځ ${day}، ${labels[row.status]}`} title={`${labels[row.status]} · ${number(row.local)} / ${number(row.province)}`} onClick={() => update({ metric: key, day, status: 'all' })}>{row.status === 'equal' ? '=' : row.status === 'mismatch' ? '≠' : '—'}</Button></td>; })}</tr>)}</tbody></table></div></section>
  </div>;
}
function SourceLink({ row, source }: { row: ReconciliationRow; source: 'local' | 'province' }) {
  const url = source === 'local' ? row.localUrl : row.provinceUrl;
  const cell = source === 'local' ? row.localCell : row.provinceCell;
  if (!url) return null;
  const label = `${source === 'local' ? 'مرکز' : 'ولایت'}: ${cell}`;
  return <Button variant="ghost" size="icon" asChild><a href={url} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}><ExternalLink className="h-4 w-4" /></a></Button>;
}