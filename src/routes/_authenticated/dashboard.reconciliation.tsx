import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { RefreshCw, AlertTriangle, Search, X, Printer, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReconciliation } from '@/lib/reconciliation.functions';
import { JALALI_MONTHS, todayJalali } from '@/lib/jalali';
import { metricDefinitions } from '@/lib/reconciliation';
import { StaffReconciliationMatrix } from '@/components/dash/StaffReconciliationMatrix';

const searchSchema = z.object({
  year: z.coerce.number().int().min(1300).max(1499).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
const reportQuery = (year: number, month: number) => queryOptions({
  queryKey: ['reconciliation', year, month],
  queryFn: () => getReconciliation({ data: { year, month } }),
  staleTime: 120000, retry: false, refetchOnWindowFocus: false,
});
export const Route = createFileRoute('/_authenticated/dashboard/reconciliation')({
  validateSearch: input => searchSchema.parse(input),
  loaderDeps: ({ search }) => ({ year: search.year, month: search.month }),
  loader: ({ context, deps }) => {
    const today = todayJalali();
    return context.queryClient.ensureQueryData(reportQuery(deps.year ?? today.y, deps.month ?? today.m));
  },
  head: () => ({ meta: [
    { title: 'د راپورونو مطابقت — Barchi Identity Insight' },
    { name: 'description', content: 'د مرکز او ولایت د میاشتنیو راپورونو خوندي، یوازې د لوستلو پرتله.' },
    { property: 'og:title', content: 'د راپورونو مطابقت — Barchi Identity Insight' },
    { property: 'og:description', content: 'د مرکز او ولایت د میاشتنیو راپورونو خوندي، یوازې د لوستلو پرتله.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  pendingComponent: () => <p role="status" className="py-10 text-muted-foreground">راپورونه لوستل کېږي…</p>,
  errorComponent: () => <div role="alert" className="py-8">د راپورونو لوستل ممکن نه شول. مهرباني وکړئ وروسته بیا هڅه وکړئ.</div>,
  component: ReconciliationPage,
});
const number = (value: number | null) => value === null ? '—' : value.toLocaleString('fa-AF');
function ReconciliationPage() {
  const search = Route.useSearch(), navigate = Route.useNavigate(), today = todayJalali();
  const year = search.year ?? today.y, month = search.month ?? today.m;
  const { data } = useSuspenseQuery(reportQuery(year, month));
  const client = useQueryClient(), fetchReport = useServerFn(getReconciliation);
  const [view, setView] = useState<'differences' | 'staff'>('differences');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState(false);
  const counts = { mismatch: 0, equal: 0, missing: 0, holiday: 0 };
  data.rows.forEach(row => counts[row.status]++);
  const hasSourceError = !!data.local.error || !!data.province.error;
  const mismatches = data.rows.filter(row => row.status === 'mismatch');
  const days = Array.from(new Set(data.rows.map(row => row.day))).sort((a,b) => a-b);
  const visibleMetrics = metricDefinitions.filter(([,label]) => label.toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase()));
  const visibleDays = onlyDifferences ? days.filter(day => data.rows.some(row => row.day===day && row.status==='mismatch' && visibleMetrics.some(([key])=>key===row.metric))) : days;
  const matrix = new Map(data.rows.map(row=>[`${row.day}:${row.metric}`,row]));
  const totals = new Map(data.totals.map(row => [row.metric, row]));
  const detail = selected ? data.rows.find(row => `${row.metric}:${row.day}` === selected) : null;
  const printRows = metricDefinitions.map(([key, label]) => ({ key, label, total: data.totals.find(row => row.metric === key) }));
  function exportSvg() {
    // SVG is generated from report data, never from the on-screen application DOM.
    const escapeXml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const width = 1120, rowHeight = 37, top = 180, height = top + printRows.length * rowHeight + 100;
    const labels = ['برخه', 'د مرکز مجموعه', 'د ولایت مجموعه', 'توپیر'];
    const columns = [1060, 610, 390, 160];
    const header = labels.map((label, index) => `<text x="${columns[index]}" y="160" text-anchor="end" font-size="17" font-weight="bold">${escapeXml(label)}</text>`).join('');
    const rowsSvg = printRows.map((row, index) => {
      const y = top + index * rowHeight;
      const values = [row.label, number(row.total?.local ?? null), number(row.total?.province ?? null), number(row.total?.delta ?? null)];
      const texts = values.map((value, col) => `<text x="${columns[col]}" y="${y + 24}" text-anchor="end" font-size="15" fill="${col === 3 && row.total?.status === 'mismatch' ? '#b91c1c' : '#172f38'}">${escapeXml(value)}</text>`).join('');
      return `<rect x="45" y="${y}" width="1030" height="${rowHeight}" fill="${index % 2 ? '#f2f7f6' : '#ffffff'}"/><line x1="45" y1="${y + rowHeight}" x2="1075" y2="${y + rowHeight}" stroke="#d9e5e2"/>${texts}`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><g direction="rtl" font-family="Noto Naskh Arabic, Noto Sans Arabic, sans-serif" fill="#172f38"><text x="1060" y="55" font-size="28" font-weight="bold" text-anchor="end">د دشت برچي د الکترونیکي تذکرو مرکز</text><text x="1060" y="94" font-size="23" font-weight="bold" text-anchor="end">د راپورونو د میاشتنیو مجموعو مطابقت</text><text x="1060" y="125" font-size="17" text-anchor="end">${escapeXml(JALALI_MONTHS[month-1])} ${year}</text><line x1="45" y1="137" x2="1075" y2="137" stroke="#0b6b74" stroke-width="2"/>${header}${rowsSvg}<text x="1060" y="${height-32}" font-size="14" text-anchor="end">سرچینه: د مرکز او ولایت Google Sheets — یوازې د لوستلو راپور</text></g></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `reconciliation-${year}-${month}.svg`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function refresh() {
    setRefreshing(true); setRefreshError(false);
    try {
      const result = await fetchReport({ data: { year, month, refresh: true } });
      client.setQueryData(reportQuery(year, month).queryKey, result);
    } catch { setRefreshError(true); }
    finally { setRefreshing(false); }
  }
  function changeMonth(value: string) {
    const [y,m] = value.split('-').map(Number);
    setSelected(null);
    void navigate({ search: { year: y, month: m } });
  }
  const months = Array.from({ length: 12 }, (_, i) => ({ year: today.y, month: i+1 }));
  if (year !== today.y) months.unshift(...Array.from({length:12},(_,i)=>({year,month:i+1})));
  return <main dir="rtl" className="space-y-4 pb-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">د راپورونو مطابقت</h1>
      <div className="flex items-center gap-2">
        <select aria-label="میاشت" className="min-h-10 rounded-lg border bg-card px-3" value={`${year}-${month}`} onChange={e=>changeMonth(e.target.value)}>
          {months.map(m=><option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{JALALI_MONTHS[m.month-1]} {m.year}</option>)}
        </select>
        <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}><Printer className="h-4 w-4" /> چاپ</Button>
        <Button variant="outline" size="sm" className="print:hidden" onClick={exportSvg}><FileImage className="h-4 w-4" /> SVG</Button>
        <Button variant="outline" size="icon" aria-label="تازه کول" title="تازه کول" disabled={refreshing} onClick={refresh}><RefreshCw className={`h-4 w-4 ${refreshing?'animate-spin':''}`}/></Button>
      </div>
    </header>
    {(hasSourceError || data.stale || refreshError) && <p role="alert" className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0"/>د سرچینې تازه معلومات نه دي تایید شوي؛ پایلې ممکن نیمګړې وي.</p>}
    <div className="grid grid-cols-3 gap-2">
      {([['توپیرونه',counts.mismatch,'text-destructive'],['برابر',counts.equal,'text-foreground'],['معلومات نشته',counts.missing,'text-muted-foreground']] as const).map(([label,value,color])=><div key={label} className="rounded-xl border p-3 text-center"><p className={`text-2xl font-bold tabular-nums ${color}`}>{number(value)}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
    </div>
    <div className="grid grid-cols-1 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-2" role="tablist" aria-label="د مطابقت ډول">
      {([['differences','د مرکز او ریاست راپورونو مطابقت']] as const).map(([key,label])=><button key={key} type="button" role="tab" aria-selected={view===key} onClick={()=>{setView(key);setSelected(null);}} className={`min-h-10 rounded-md px-2 text-sm font-medium ${view===key?'bg-background shadow-sm':''}`}>{label}</button>)}
      <button type="button" role="tab" aria-selected={view==='staff'} onClick={()=>{setView('staff');setSelected(null);}} className={`min-h-10 rounded-md px-2 text-sm font-medium ${view==='staff'?'bg-background shadow-sm':''}`}>د کارمندانو او تخنیکي راپورونو مطابقت</button>
    </div>
    {view==='staff' ? <StaffReconciliationMatrix year={year} month={month}/> : <section className="space-y-3" aria-label="د مرکز او ریاست راپورونو مطابقت">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">د میاشتې د مطابقت جدول</h2>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{JALALI_MONTHS[month-1]} {year}</span>
          <span className="text-xs text-muted-foreground">{visibleDays.length} ورځې · {visibleMetrics.length} برخې</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute right-2 h-4 w-4 text-muted-foreground"/>
            <input aria-label="د برخې لټون" value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="برخه ولټوئ…" className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52"/>
            {searchText && <button type="button" aria-label="لټون پاکول" onClick={()=>setSearchText('')} className="absolute left-2 text-muted-foreground"><X className="h-4 w-4"/></button>}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)} className="h-4 w-4 accent-primary"/>
            یوازې توپیر لرونکې ورځې
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-destructive/30 bg-destructive/15"/>توپیر (د مرکز − ریاست)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-emerald-500/30 bg-emerald-500/10"/>برابر</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border bg-muted"/>معلومات نشته</span>
      </div>
      <div className="relative z-0 max-w-full overflow-x-auto rounded-xl border bg-card shadow-sm" role="region" aria-label="د برخو او ورځو د مطابقت جدول" tabIndex={0}>
        <table className="w-full min-w-[780px] table-fixed border-collapse text-center text-[9px] leading-none sm:text-[10px]">
          <thead>
            <tr>
              <th scope="col" className="w-[118px] border border-border bg-muted px-1 py-1.5 text-right font-semibold sm:w-[140px]">برخه</th>
              {visibleDays.map(day=><th key={day} scope="col" className="border border-border bg-muted px-0 py-1.5 font-semibold tabular-nums" title={`${day} ${JALALI_MONTHS[month-1]} ${year}`}>{number(day)}</th>)}
              {['د مرکز مجموعه', 'د ولایت مجموعه', 'د مجموعې توپیر'].map(label => <th key={label} scope="col" className="w-[76px] border border-border bg-secondary px-1 py-2 text-xs leading-5 font-semibold">{label}</th>)}
              <th scope="col" className="w-[54px] break-words border border-border bg-muted px-0.5 py-1 font-semibold">د ورځنیو توپیرونو شمېر</th>
            </tr>
          </thead>
          <tbody>
            {visibleMetrics.map(([key,label],index)=>{
              const sectionErrors = visibleDays.filter(day=>matrix.get(`${day}:${key}`)?.status==='mismatch').length;
              const total = totals.get(key);
              const totalStatus = total?.status ?? 'missing';
              const totalColor = totalStatus === 'mismatch' ? 'bg-destructive/10 text-destructive' : totalStatus === 'equal' ? 'bg-success/10 text-foreground' : 'bg-muted text-muted-foreground';
              return <tr key={key} className={index%2===0?'bg-card':'bg-muted/20'}>
                <th scope="row" className={`break-words border border-border px-1 py-1 text-right font-semibold ${index%2===0?'bg-card':'bg-muted'}`}>{label}</th>
                {visibleDays.map(day=>{
                  const row=matrix.get(`${day}:${key}`);
                  const status=row?.status??'missing';
                  const active=selected===`${key}:${day}`;
                  return <td key={day} className="border border-border p-0">
                    <button type="button" disabled={!row} onClick={()=>row&&setSelected(`${row.metric}:${row.day}`)}
                      title={`${label} — ${day} ${JALALI_MONTHS[month-1]}: ${status==='mismatch'?'توپیر '+number(row?.delta??null):status==='equal'?'برابر':status==='holiday'?'جمعه ـ رخصتي':'معلومات نشته'}`}
                      aria-label={`${label}، ${day} ${JALALI_MONTHS[month-1]}، ${status==='mismatch'?'توپیر '+number(row?.delta??null):status==='equal'?'برابر':status==='holiday'?'جمعه ـ رخصتي':'معلومات نشته'}`}
                      aria-pressed={active}
                      className={`min-h-6 w-full border border-transparent px-0 font-medium tabular-nums transition-colors hover:border-primary/40 focus-visible:relative focus-visible:z-10 focus-visible:border-primary focus-visible:outline-none ${status==='mismatch'?'bg-destructive/10 text-destructive':status==='equal'?'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':'text-muted-foreground'} ${active?'!border-primary bg-primary/10':''}`}>
                      {status==='mismatch'?number(row?.delta??null):status==='equal'?'✓':status==='holiday'?'ج':'—'}
                    </button>
                  </td>;
                })}
                {(['local', 'province', 'delta'] as const).map(field => {
                  const value = total?.[field] ?? null;
                  const url = field === 'local' ? total?.localUrl : field === 'province' ? total?.provinceUrl : null;
                  const statusLabel = totalStatus === 'equal' ? 'برابر' : totalStatus === 'mismatch' ? 'توپیر' : 'معلومات نشته';
                  return <td key={field} className={`border border-border px-1 py-2 text-xs leading-5 font-semibold tabular-nums ${totalColor}`} title={statusLabel}>
                    {url && value !== null ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-4" aria-label={`${label} — ${field === 'local' ? 'د مرکز مجموعه' : 'د ولایت مجموعه'}: ${number(value)}`}>{number(value)}</a> : <span>{number(value)}</span>}
                    {field === 'delta' && <span className="sr-only"> {statusLabel}</span>}
                  </td>;
                })}
                <td className={`border border-border px-0.5 py-0.5 font-bold tabular-nums ${sectionErrors?'bg-destructive/5 text-destructive':'text-muted-foreground'}`}>{number(sectionErrors)}</td>
              </tr>;
            })}
            {!visibleMetrics.length && <tr><td colSpan={visibleDays.length+5} className="p-8 text-center text-muted-foreground">د لټون مطابق برخه ونه موندل شوه.</td></tr>}
          </tbody>
          {visibleMetrics.length>0 && <tfoot><tr>
            <th scope="row" className="border border-border bg-muted px-1 py-1.5 text-right font-bold">د توپیرونو مجموعه</th>
            {visibleDays.map(day=><td key={day} className="border border-border bg-muted px-0 py-1 font-semibold tabular-nums text-destructive">{number(visibleMetrics.filter(([key])=>matrix.get(`${day}:${key}`)?.status==='mismatch').length)}</td>)}
            <td colSpan={3} className="border border-border bg-secondary px-1 py-2 text-xs leading-5 text-muted-foreground">د میاشتني مجموعې اختلافونه: {number(visibleMetrics.filter(([key]) => totals.get(key)?.status === 'mismatch').length)}</td>
            <td className="border border-border bg-muted px-0.5 py-1 font-bold tabular-nums text-destructive">{number(visibleDays.reduce((sum,day)=>sum+visibleMetrics.filter(([key])=>matrix.get(`${day}:${key}`)?.status==='mismatch').length,0))}</td>
          </tr></tfoot>}
        </table>
      </div>
      <p className="text-xs text-muted-foreground">پر هره خانه کلیک وکړئ چې د مرکز او ریاست شمېرې وګورئ. په کوچنیو سکرینونو کې جدول د لمس یا ټچ‌پډ له لارې خوځولای شئ؛ جدول یوازې د لوستلو لپاره دی.</p>
    </section>}
    <section id="reconciliation-print-report" className="reconciliation-print-report" dir="rtl" aria-label="د چاپ لپاره رسمي راپور">
      <header className="report-print-heading">
        <h1>د دشت برچي د الکترونیکي تذکرو مرکز</h1>
        <h2>د راپورونو د میاشتنیو مجموعو مطابقت</h2>
        <p>میاشت: {JALALI_MONTHS[month-1]} {number(year)} — سرچینې: د مرکز او ولایت راپورونه</p>
      </header>
      <table className="report-print-table">
        <thead><tr><th>شمېره</th><th>برخه</th><th>د مرکز مجموعه</th><th>د ولایت مجموعه</th><th>توپیر</th><th>حالت</th></tr></thead>
        <tbody>{printRows.map((row, index) => <tr key={row.key}><td>{number(index+1)}</td><th scope="row">{row.label}</th><td>{number(row.total?.local ?? null)}</td><td>{number(row.total?.province ?? null)}</td><td>{number(row.total?.delta ?? null)}</td><td>{row.total?.status === 'equal' ? 'برابر' : row.total?.status === 'mismatch' ? 'توپیر' : 'معلومات نشته'}</td></tr>)}</tbody>
      </table>
      <footer className="report-print-footer">دا راپور د Google Sheets له ثبت شویو مجموعو څخه جوړ شوی؛ نشتې شمېرې صفر نه ګڼل کېږي.</footer>
    </section>
    {detail && <section className="rounded-lg border p-4" aria-live="polite"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{detail.day} {JALALI_MONTHS[month-1]} — {detail.label}</h2><Button size="sm" variant="ghost" onClick={()=>setSelected(null)}>بندول</Button></div><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><p className="text-muted-foreground">زموږ راپور</p><strong>{number(detail.local)}</strong></div><div><p className="text-muted-foreground">ولایت</p><strong>{number(detail.province)}</strong></div><div><p className="text-muted-foreground">توپیر</p><strong className={detail.status==='mismatch'?'text-destructive':''}>{number(detail.delta)}</strong></div></div></section>}
  </main>;
}
