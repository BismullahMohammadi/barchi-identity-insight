import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { RefreshCw, AlertTriangle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReconciliation } from '@/lib/reconciliation.functions';
import { JALALI_MONTHS, todayJalali } from '@/lib/jalali';
import { metricDefinitions } from '@/lib/reconciliation';

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
  head: () => ({ meta: [{ title: 'د راپورونو مطابقت — Barchi Identity Insight' }] }),
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
  const [view, setView] = useState<'days' | 'differences'>('differences');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState(false);
  const counts = { mismatch: 0, equal: 0, missing: 0 };
  data.rows.forEach(row => counts[row.status]++);
  const hasSourceError = !!data.local.error || !!data.province.error;
  const mismatches = data.rows.filter(row => row.status === 'mismatch');
  const days = Array.from(new Set(data.rows.map(row => row.day))).sort((a,b) => a-b);
  const visibleMetrics = metricDefinitions.filter(([,label]) => label.toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase()));
  const visibleDays = onlyDifferences ? days.filter(day => data.rows.some(row => row.day===day && row.status==='mismatch' && visibleMetrics.some(([key])=>key===row.metric))) : days;
  const matrix = new Map(data.rows.map(row=>[`${row.day}:${row.metric}`,row]));
  const detail = selected ? data.rows.find(row => `${row.metric}:${row.day}` === selected) : null;
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
        <Button variant="outline" size="icon" aria-label="تازه کول" title="تازه کول" disabled={refreshing} onClick={refresh}><RefreshCw className={`h-4 w-4 ${refreshing?'animate-spin':''}`}/></Button>
      </div>
    </header>
    {(hasSourceError || data.stale || refreshError) && <p role="alert" className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0"/>د سرچینې تازه معلومات نه دي تایید شوي؛ پایلې ممکن نیمګړې وي.</p>}
    <div className="grid grid-cols-3 gap-2">
      {([['توپیرونه',counts.mismatch,'text-destructive'],['برابر',counts.equal,'text-foreground'],['معلومات نشته',counts.missing,'text-muted-foreground']] as const).map(([label,value,color])=><div key={label} className="rounded-xl border p-3 text-center"><p className={`text-2xl font-bold tabular-nums ${color}`}>{number(value)}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
    </div>
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="د مطابقت ډول">
      {([['days','د ورځو مطابقت'],['differences','د توپیرونو مطابقت']] as const).map(([key,label])=><button key={key} type="button" role="tab" aria-selected={view===key} onClick={()=>{setView(key);setSelected(null);}} className={`min-h-10 rounded-md px-2 text-sm font-medium ${view===key?'bg-background shadow-sm':''}`}>{label}</button>)}
    </div>
    {view==='days' ? <section className="overflow-x-auto rounded-lg border" aria-label="د ورځو مطابقت">
      <table className="w-full text-right text-sm"><thead className="bg-muted/50"><tr><th className="p-3">ورځ</th><th className="p-3">برخه</th><th className="p-3">توپیر</th></tr></thead><tbody>
        {mismatches.sort((a,b)=>a.day-b.day).map(row=><tr key={`${row.metric}:${row.day}`} className="cursor-pointer border-t hover:bg-muted/40" onClick={()=>setSelected(`${row.metric}:${row.day}`)}><td className="p-3">{row.day} {JALALI_MONTHS[month-1]}</td><td className="p-3">{row.label}</td><td className="p-3 font-semibold text-destructive" dir="ltr">{number(row.delta)}</td></tr>)}
        {!mismatches.length && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{hasSourceError || counts.missing ? 'تایید شوي اختلافونه نشته؛ ځینې معلومات لا نه دي بشپړ.' : 'هیڅ اختلاف ونه موندل شو.'}</td></tr>}
      </tbody></table>
    </section> : <section className="space-y-3" aria-label="د توپیرونو مطابقت">
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
      <div className="max-h-[68vh] overflow-auto rounded-xl border bg-card shadow-sm" role="region" aria-label="د ورځو او برخو د مطابقت جدول" tabIndex={0}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-center text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky right-0 top-0 z-30 min-w-[96px] border-b border-l bg-muted px-3 py-3 text-right font-semibold shadow-[inset_0_-1px_0_hsl(var(--border))]">نېټه</th>
              {visibleMetrics.map(([key,label])=><th key={key} scope="col" className="sticky top-0 z-20 min-w-[112px] max-w-[150px] border-b border-l bg-muted px-3 py-3 font-semibold leading-5">{label}</th>)}
              <th scope="col" className="sticky top-0 z-20 min-w-[96px] border-b bg-muted px-3 py-3 font-semibold">ټول توپیرونه</th>
            </tr>
          </thead>
          <tbody>
            {visibleDays.map((day,index)=>{
              const dayErrors = visibleMetrics.filter(([key])=>matrix.get(`${day}:${key}`)?.status==='mismatch').length;
              return <tr key={day} className={index%2===0?'bg-card':'bg-muted/20'}>
                <th scope="row" className={`sticky right-0 z-10 whitespace-nowrap border-b border-l px-3 py-2 text-right font-semibold ${index%2===0?'bg-card':'bg-muted'}`}>{day} {JALALI_MONTHS[month-1]}</th>
                {visibleMetrics.map(([key,label])=>{
                  const row=matrix.get(`${day}:${key}`);
                  const status=row?.status??'missing';
                  const active=selected===`${key}:${day}`;
                  return <td key={key} className="border-b border-l p-0">
                    <button type="button" disabled={!row} onClick={()=>row&&setSelected(`${row.metric}:${row.day}`)}
                      title={`${day} ${JALALI_MONTHS[month-1]} — ${label}: ${status==='mismatch'?'توپیر '+number(row?.delta??null):status==='equal'?'برابر':'معلومات نشته'}`}
                      aria-label={`${day} ${JALALI_MONTHS[month-1]}، ${label}، ${status==='mismatch'?'توپیر '+number(row?.delta??null):status==='equal'?'برابر':'معلومات نشته'}`}
                      aria-pressed={active}
                      className={`min-h-11 w-full border-2 border-transparent px-2 font-medium tabular-nums transition-colors hover:border-primary/40 focus-visible:relative focus-visible:z-10 focus-visible:border-primary focus-visible:outline-none ${status==='mismatch'?'bg-destructive/10 text-destructive':status==='equal'?'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':'text-muted-foreground'} ${active?'!border-primary bg-primary/10':''}`}>
                      {status==='mismatch'?number(row?.delta??null):status==='equal'?'✓':'—'}
                    </button>
                  </td>;
                })}
                <td className={`border-b px-3 py-2 font-bold tabular-nums ${dayErrors?'bg-destructive/5 text-destructive':'text-muted-foreground'}`}>{number(dayErrors)}</td>
              </tr>;
            })}
            {!visibleDays.length && <tr><td colSpan={visibleMetrics.length+2} className="p-8 text-center text-muted-foreground">د ټاکل شوي فلټر لپاره ورځې ونه موندل شوې.</td></tr>}
          </tbody>
          {visibleDays.length>0 && <tfoot><tr>
            <th scope="row" className="sticky bottom-0 right-0 z-20 border-t border-l bg-muted px-3 py-3 text-right font-bold">د توپیرونو مجموعه</th>
            {visibleMetrics.map(([key])=><td key={key} className="sticky bottom-0 z-10 border-t border-l bg-muted px-2 py-3 font-semibold tabular-nums text-destructive">{number(visibleDays.filter(day=>matrix.get(`${day}:${key}`)?.status==='mismatch').length)}</td>)}
            <td className="sticky bottom-0 z-10 border-t bg-muted px-3 py-3 font-bold tabular-nums text-destructive">{number(visibleDays.reduce((sum,day)=>sum+visibleMetrics.filter(([key])=>matrix.get(`${day}:${key}`)?.status==='mismatch').length,0))}</td>
          </tr></tfoot>}
        </table>
      </div>
      <p className="text-xs text-muted-foreground">پر هره خانه کلیک وکړئ چې د مرکز او ریاست شمېرې وګورئ. جدول یوازې د لوستلو لپاره دی.</p>
    </section>}
    {detail && <section className="rounded-lg border p-4" aria-live="polite"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{detail.day} {JALALI_MONTHS[month-1]} — {detail.label}</h2><Button size="sm" variant="ghost" onClick={()=>setSelected(null)}>بندول</Button></div><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><p className="text-muted-foreground">زموږ راپور</p><strong>{number(detail.local)}</strong></div><div><p className="text-muted-foreground">ولایت</p><strong>{number(detail.province)}</strong></div><div><p className="text-muted-foreground">توپیر</p><strong className={detail.status==='mismatch'?'text-destructive':''}>{number(detail.delta)}</strong></div></div></section>}
  </main>;
}
