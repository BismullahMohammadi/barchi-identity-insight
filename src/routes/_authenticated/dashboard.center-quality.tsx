import { RotatingTazkira } from "@/components/DashboardArtwork";
import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { RefreshCw, Trophy, TrendingUp, Building2, CalendarDays, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCenterQuality } from '@/lib/center-quality.functions';
import { todayJalali, JALALI_MONTHS } from '@/lib/jalali';

const schema = z.object({ year:z.coerce.number().int().min(1300).max(1499).optional(), month:z.coerce.number().int().min(0).max(12).optional() });
const query = (year:number,month:number) => queryOptions({queryKey:['center-quality',year,month],queryFn:()=>getCenterQuality({data:{year,month}}),staleTime:120000,retry:false});
export const Route = createFileRoute('/_authenticated/dashboard/center-quality')({
 validateSearch:input=>schema.parse(input),
 loaderDeps:({search})=>({year:search.year,month:search.month}),
 loader:({context,deps})=>{const t=todayJalali();return context.queryClient.ensureQueryData(query(deps.year??t.y,deps.month??t.m));},
 head:()=>({meta:[{title:'د مرکزونو د فعالیت پرتله — Barchi Identity Insight'}]}),
 pendingComponent:()=> <p role="status" className="py-10 text-center text-muted-foreground">د مرکزونو راپورونه لوستل کېږي…</p>,
 errorComponent:()=> <p role="alert" className="rounded-xl border p-6 text-destructive">د ولایت راپورونه اوس نه شي لوستل کېدای. مهرباني وکړئ وروسته بیا هڅه وکړئ.</p>,
 component:Page
});
const fmt=(n:number)=>n.toLocaleString('fa-AF');
type Center={name:string;status:string;total:number;reportedDays:number;complete:boolean;days:{day:number;value:number|null}[]};
function Page(){
 const search=Route.useSearch(),navigate=Route.useNavigate(),today=todayJalali();
 const year=search.year??today.y,month=search.month??today.m;
 const {data}=useSuspenseQuery(query(year,month));
 const fetcher=useServerFn(getCenterQuality),client=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[day,setDay]=useState(0);
 const centers=data.centers as Center[];
 const annual=month===0;
 const valueOf=(c:Center)=>!annual&&day?c.days[day-1]?.value??null:c.reportedDays?c.total:null;
 const ranked=[...centers].sort((a,b)=>(valueOf(b)??-1)-(valueOf(a)??-1));
 const withData=ranked.filter(c=>valueOf(c)!==null);
 const total=withData.reduce((sum,c)=>sum+(valueOf(c)??0),0);
 const max=Math.max(1,...withData.map(c=>valueOf(c)??0));
 const barchi=centers.find(c=>c.name==='مرکز دشت برچی');
 const barchiValue=barchi?valueOf(barchi):null;
 const barchiRank=barchiValue===null?null:ranked.findIndex(c=>c.name==='مرکز دشت برچی')+1;
 const available=centers.filter(c=>c.reportedDays>0).length;
 const maxDays=Math.max(...centers.map(c=>c.days.length),0);
 const selectedDayCount=centers.filter(c=>!annual&&day?c.days[day-1]?.value!==null&&c.days[day-1]?.value!==undefined:c.reportedDays>0).length;
 async function refresh(){setBusy(true);setError(false);try{const result=await fetcher({data:{year,month,refresh:true}});client.setQueryData(query(year,month).queryKey,result);}catch{setError(true);}finally{setBusy(false);}}
 return <div dir="rtl" className="space-y-5 pb-8">
  <header className="dashboard-page-heading flex flex-wrap items-start justify-between gap-3">
   <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-extrabold sm:text-2xl">د مرکزونو د فعالیت پرتله</h1><RotatingTazkira className="w-14 shrink-0 sm:w-16" /></div><p className="mt-1 text-xs text-muted-foreground">کنټرول کیفیت: په عادي بهیر کې د معلوماتو تایید او چاپ ته لېږل</p></div>
   <div className="flex items-center gap-2">
    <select aria-label="میاشت یا مکمل کال" className="min-h-10 rounded-xl border bg-card px-3 text-sm" value={month} onChange={e=>{setDay(0);void navigate({search:{year,month:Number(e.target.value)}});}}><option value={0}>مکمل کال {year}</option>{JALALI_MONTHS.map((name,i)=><option key={i} value={i+1}>{name} {year}</option>)}</select>
    <select aria-label="کال" className="min-h-10 rounded-xl border bg-card px-2 text-sm" value={year} onChange={e=>{setDay(0);void navigate({search:{year:Number(e.target.value),month}});}}>{Array.from(new Set([today.y-2,today.y-1,today.y,year])).sort((a,b)=>b-a).map(y=><option key={y} value={y}>{fmt(y)}</option>)}</select>
    <Button variant="outline" size="icon" aria-label="معلومات تازه کړئ" title="تازه کول" disabled={busy} onClick={refresh}><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/></Button>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">د تازه کولو هڅه ناکامه شوه؛ مخکیني معلومات ښکاري.</p>}
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Stat icon={<Trophy className="h-4 w-4"/>} title="لومړی مرکز" value={withData[0]?.name??'—'} small />
   <Stat icon={<TrendingUp className="h-4 w-4"/>} title={annual?'د کال ټول فعالیت':day?'د ورځې ټول فعالیت':'د میاشتې ټول فعالیت'} value={withData.length?fmt(total):'—'} />
   <Stat icon={<Building2 className="h-4 w-4"/>} title="راپور لرونکي مرکزونه" value={`${fmt(selectedDayCount)} / ${fmt(centers.length)}`} />
   <Stat icon={<CalendarDays className="h-4 w-4"/>} title="د دشت برچي درجه" value={barchiRank===null?'—':`${fmt(barchiRank)} مقام`} />
  </div>
  <section className="rounded-2xl border bg-card p-4 sm:p-5">
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="font-bold">د مرکزونو درجه بندي</h2><p className="mt-1 text-xs text-muted-foreground">{annual?`د ${fmt(year)} کال ثبت شوی فعالیت`:day?`${fmt(day)} ${JALALI_MONTHS[month-1]}`:'د میاشتې تر اوسه ثبت شوی فعالیت'}</p></div>
    {!annual&&<label className="flex items-center gap-2 text-sm">ورځ <select aria-label="د پرتله کولو ورځ" className="min-h-9 rounded-lg border bg-background px-2" value={day} onChange={e=>setDay(Number(e.target.value))}><option value={0}>ټوله میاشت</option>{Array.from({length:maxDays},(_,i)=><option key={i+1} value={i+1}>{fmt(i+1)}</option>)}</select></label>}
   </div>
   <div className="space-y-2.5">
    {ranked.map((center,index)=>{
     const value=valueOf(center),percent=value===null?0:Math.max(0,(value/max)*100);
     const own=center.name==='مرکز دشت برچی';
     return <div key={center.name} className={`rounded-xl border px-3 py-3 transition-colors ${own?'border-primary/40 bg-primary/5':'border-border/70'}`}>
      <div className="mb-2 flex items-center gap-2 text-sm">
       <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${index===0&&value!==null?'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200':'bg-muted'}`}>{value===null?'—':fmt(index+1)}</span>
       <span className="min-w-0 flex-1 truncate font-semibold">{center.name}{own&&<span className="ms-2 text-xs text-primary">(زموږ مرکز)</span>}</span>
       <span className="shrink-0 font-bold tabular-nums">{value===null?'—':fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${center.name}: ${value===null?'معلومات نشته':fmt(value)}`}><div className={`h-full rounded-full transition-all ${own?'bg-primary':'bg-sky-500/80 dark:bg-sky-400/80'}`} style={{width:`${percent}%`}}/></div>
      {!day&&<p className="mt-1.5 text-[11px] text-muted-foreground">{fmt(center.reportedDays)} ثبت شوې ورځې{!center.complete?' · ځینې میاشتې یا معلومات نه دي پېژندل شوي':''}</p>}
     </div>;
    })}
   </div>
  </section>
  <section className="rounded-xl border bg-muted/30 p-4 text-sm">
   <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div className="space-y-1"><p className="font-semibold">د شمېرنو په اړه</p><p className="text-muted-foreground">یوازې د کنټرول کیفیت د عادي بهیر شمېرې پرتله کېږي. خالي خانې صفر نه دي. د ټاکلې مودې درجه بندي د ثبت شویو ورځو پر مجموعې ولاړه ده؛ د نیمګړو ورځو له امله یې پرتله ممکن بشپړه نه وي.</p>{available===0&&<p className="text-destructive">د ټاکلې مودې لپاره هېڅ مرکز کې شمېرې ونه موندل شوې؛ د سرچینې د میاشتې سرلیکونه وګورئ.</p>}</div></div>
  </section>
 </div>;
}
function Stat({icon,title,value,small=false}:{icon:React.ReactNode;title:string;value:string;small?:boolean}){
 return <div className="min-w-0 rounded-2xl border bg-card p-4"><div className="mb-3 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{title}</span></div><p className={`break-words font-extrabold ${small?'text-sm sm:text-base':'text-xl sm:text-2xl'}`}>{value}</p></div>;
}
