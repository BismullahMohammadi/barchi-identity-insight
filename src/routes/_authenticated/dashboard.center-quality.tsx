import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCenterQuality } from '@/lib/center-quality.functions';
import { todayJalali, JALALI_MONTHS } from '@/lib/jalali';
const schema=z.object({year:z.coerce.number().int().optional(),month:z.coerce.number().int().min(1).max(12).optional()});
const query=(year:number,month:number)=>queryOptions({queryKey:['center-quality',year,month],queryFn:()=>getCenterQuality({data:{year,month}}),staleTime:120000,retry:false});
export const Route=createFileRoute('/_authenticated/dashboard/center-quality')({
 validateSearch:input=>schema.parse(input),
 loaderDeps:({search})=>({year:search.year,month:search.month}),
 loader:({context,deps})=>{const t=todayJalali();return context.queryClient.ensureQueryData(query(deps.year??t.y,deps.month??t.m));},
 head:()=>({meta:[{title:'د مرکزونو د فعالیت پرتله — Barchi Identity Insight'}]}),
 pendingComponent:()=> <p className="py-8">د مرکزونو راپورونه لوستل کېږي…</p>,
 errorComponent:()=> <p role="alert" className="py-8">د ولایت راپورونه اوس نه شي لوستل کېدای. وروسته بیا هڅه وکړئ.</p>,
 component:Page
});
function Page(){
 const search=Route.useSearch(),navigate=Route.useNavigate(),today=todayJalali();
 const year=search.year??today.y,month=search.month??today.m;
 const {data}=useSuspenseQuery(query(year,month));
 const fetcher=useServerFn(getCenterQuality),client=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[day,setDay]=useState(0);
 const rows=[...data.centers].sort((a,b)=>day?(b.days[day-1]?.value??-1)-(a.days[day-1]?.value??-1):b.total-a.total);
 async function refresh(){setBusy(true);setError(false);try{const result=await fetcher({data:{year,month,refresh:true}});client.setQueryData(query(year,month).queryKey,result);}catch{setError(true);}finally{setBusy(false);}}
 return <div dir="rtl" className="space-y-4">
  <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">د مرکزونو د فعالیت پرتله</h1><div className="flex gap-2">
   <select aria-label="میاشت" className="rounded-lg border bg-card px-3" value={month} onChange={e=>{setDay(0);void navigate({search:{year,month:Number(e.target.value)}});}}>{JALALI_MONTHS.map((name,i)=><option key={i} value={i+1}>{name} {year}</option>)}</select>
   <Button variant="outline" size="icon" disabled={busy} aria-label="تازه کول" onClick={refresh}><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/></Button>
  </div></header>
  <p className="text-sm text-muted-foreground">یوازې کنترل کیفیت (تصدیق معلومات وارسال به چاپ، روند عادی)</p>
  {error&&<p role="alert" className="text-destructive">تازه معلومات ونه لوستل شول؛ پخوانۍ شمېرې ښودل کېږي.</p>}
  <label className="flex items-center gap-2 text-sm">ورځ: <select aria-label="ورځ" className="rounded-lg border bg-card p-2" value={day} onChange={e=>setDay(Number(e.target.value))}><option value={0}>ټوله میاشت</option>{Array.from({length:month<=6?31:30},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
  <div className="overflow-x-auto rounded-lg border"><table className="w-full text-right text-sm"><thead className="bg-muted/50"><tr><th className="p-3">درجه</th><th className="p-3">مرکز</th><th className="p-3">{day?'د ورځې فعالیت':'د میاشتې فعالیت'}</th><th className="p-3">ثبت شوې ورځې</th></tr></thead><tbody>{rows.map((center,i)=>{const value=day?center.days[day-1]?.value:center.total;return <tr key={center.name} className={`border-t ${center.name==='مرکز دشت برچی'?'bg-primary/5 font-bold':''}`}><td className="p-3">{value===null||value===undefined?'—':i+1}</td><td className="p-3">{center.name}</td><td className="p-3 tabular-nums">{day?(value===null||value===undefined?'—':value.toLocaleString('fa-AF')):center.reportedDays?center.total.toLocaleString('fa-AF'):'—'}</td><td className="p-3">{center.reportedDays}</td></tr>})}</tbody></table></div>
  <p className="text-xs text-muted-foreground">خالي خانې صفر نه ګڼل کېږي. نیمګړي راپورونه ممکن د مرکزونو پر درجه بندۍ اغېز وکړي.</p>
 </div>;
}
