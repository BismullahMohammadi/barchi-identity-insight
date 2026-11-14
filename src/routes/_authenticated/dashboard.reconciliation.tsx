import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReconciliation } from '@/lib/reconciliation.functions';
import { JALALI_MONTHS, todayJalali } from '@/lib/jalali';
import { metricDefinitions, type ReconciliationRow } from '@/lib/reconciliation';

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
const tone = (status: string) => status === 'mismatch' ? 'bg-destructive/10 text-destructive' : status === 'equal' ? 'bg-success/10 text-foreground' : 'bg-warning/15 text-foreground';
function ReconciliationPage() {
  const search = Route.useSearch(), navigate = Route.useNavigate(), today = todayJalali();
  const year = search.year ?? today.y, month = search.month ?? today.m;
  const { data } = useSuspenseQuery(reportQuery(year, month));
  const client = useQueryClient(), fetchReport = useServerFn(getReconciliation);
  const [view, setView] = useState<'days' | 'sections' | 'differences'>('differences');
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState(false);
  const counts = { mismatch: 0, equal: 0, missing: 0 };
  data.rows.forEach(row => counts[row.status]++);
  const hasSourceError = !!data.local.error || !!data.province.error;
  const mismatches = data.rows.filter(row => row.status === 'mismatch');
  const days = Array.from(new Set(data.rows.map(row => row.day))).sort((a,b) => a-b);
  const metricRows = metricDefinitions.map(([key, label]) => ({ key, label, rows: data.rows.filter(row => row.metric === key), errors: mismatches.filter(row => row.metric === key) }));
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
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="د مطابقت ډول">
      {([['days','د ورځو مطابقت'],['sections','د برخو مطابقت'],['differences','د توپیرونو مطابقت']] as const).map(([key,label])=><button key={key} type="button" role="tab" aria-selected={view===key} onClick={()=>{setView(key);setSelected(null);}} className={`min-h-10 rounded-md px-2 text-xs font-medium sm:text-sm ${view===key?'bg-background shadow-sm':''}`}>{label}</button>)}
    </div>
    {view==='days' ? <section className="overflow-x-auto rounded-lg border" aria-label="د ورځو مطابقت">
      <table className="w-full text-right text-sm"><thead className="bg-muted/50"><tr><th className="p-3">ورځ</th><th className="p-3">برخه</th><th className="p-3">توپیر</th></tr></thead><tbody>
        {mismatches.sort((a,b)=>a.day-b.day).map(row=><tr key={`${row.metric}:${row.day}`} className="cursor-pointer border-t hover:bg-muted/40" onClick={()=>setSelected(`${row.metric}:${row.day}`)}><td className="p-3">{row.day} {JALALI_MONTHS[month-1]}</td><td className="p-3">{row.label}</td><td className="p-3 font-semibold text-destructive" dir="ltr">{number(row.delta)}</td></tr>)}
        {!mismatches.length && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{hasSourceError || counts.missing ? 'تایید شوي اختلافونه نشته؛ ځینې معلومات لا نه دي بشپړ.' : 'هیڅ اختلاف ونه موندل شو.'}</td></tr>}
      </tbody></table>
    </section> : view==='sections' ? <section className="space-y-2" aria-label="د برخو مطابقت">
      {metricRows.map(item=><details key={item.key} className="rounded-lg border p-3"><summary className="flex cursor-pointer items-center justify-between gap-2 font-medium"><span>{item.label}</span><span className={`rounded px-2 py-1 text-xs ${item.errors.length?'bg-destructive/10 text-destructive':item.rows.some(r=>r.status==='missing')?'bg-warning/15':'bg-success/10'}`}>{item.errors.length ? `${item.errors.length} توپیر` : item.rows.some(r=>r.status==='missing')?'نیمګړي معلومات':'برابر'}</span></summary><div className="mt-3 flex flex-wrap gap-1">{days.map(day=>{const row=item.rows.find(r=>r.day===day);return <button type="button" key={day} onClick={()=>row&&setSelected(`${row.metric}:${row.day}`)} className={`min-h-9 min-w-9 rounded border px-2 text-xs ${tone(row?.status??'missing')}`} title={row?.status==='mismatch'?'توپیر':row?.status==='equal'?'برابر':'معلومات نشته'}>{day}</button>})}</div></details>)}
    </section> : <section className="space-y-2" aria-label="د توپیرونو مطابقت">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>ورځې په قطارونو او برخې په کالمونو کې دي. پر هره خانه کلیک وکړئ چې د دواړو راپورونو شمېرې وګورئ.</p>
        <div className="flex items-center gap-3"><span>🔴 توپیر</span><span>✓ برابر</span><span>— معلومات نشته</span></div>
      </div>
      <div className="max-h-[65vh] overflow-auto rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-center text-xs">
          <thead><tr><th scope="col" className="sticky right-0 top-0 z-30 min-w-20 border-b border-l bg-muted p-2">ورځ</th>
            {metricDefinitions.map(([key,label])=><th key={key} scope="col" className="sticky top-0 z-20 min-w-24 max-w-32 whitespace-normal border-b border-l bg-muted p-2 font-medium">{label}</th>)}
            <th scope="col" className="sticky top-0 z-20 min-w-20 border-b bg-muted p-2">توپیرونه</th>
          </tr></thead>
          <tbody>{days.map(day=>{
            const byMetric = new Map(data.rows.filter(r=>r.day===day).map(r=>[r.metric,r]));
            const dayErrors = data.rows.filter(r=>r.day===day && r.status==='mismatch').length;
            return <tr key={day}>
              <th scope="row" className="sticky right-0 z-10 whitespace-nowrap border-b border-l bg-card p-2 font-semibold">{day} {JALALI_MONTHS[month-1]}</th>
              {metricDefinitions.map(([key])=>{
                const row=byMetric.get(key);
                const status=row?.status??'missing';
                return <td key={key} className="border-b border-l p-1">
                  <button type="button" disabled={!row} onClick={()=>row&&setSelected(`${row.metric}:${row.day}`)}
                    aria-label={`${day} ${JALALI_MONTHS[month-1]}، ${row?.label??key}، ${status==='mismatch'?'توپیر '+number(row?.delta??null):status==='equal'?'برابر':'معلومات نشته'}`}
                    className={`min-h-9 w-full rounded px-2 font-medium tabular-nums ${tone(status)} ${selected===`${key}:${day}`?'ring-2 ring-primary':''}`}>
                    {status==='mismatch'?number(row?.delta??null):status==='equal'?'✓':'—'}
                  </button>
                </td>;
              })}
              <td className={`border-b p-2 font-semibold tabular-nums ${dayErrors?'text-destructive':'text-muted-foreground'}`}>{number(dayErrors)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>}
    {detail && <section className="rounded-lg border p-4" aria-live="polite"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{detail.day} {JALALI_MONTHS[month-1]} — {detail.label}</h2><Button size="sm" variant="ghost" onClick={()=>setSelected(null)}>بندول</Button></div><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><p className="text-muted-foreground">زموږ راپور</p><strong>{number(detail.local)}</strong></div><div><p className="text-muted-foreground">ولایت</p><strong>{number(detail.province)}</strong></div><div><p className="text-muted-foreground">توپیر</p><strong className={detail.status==='mismatch'?'text-destructive':''}>{number(detail.delta)}</strong></div></div></section>}
  </main>;
}
