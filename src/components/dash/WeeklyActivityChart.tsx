import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { weeklyActivity, weeklyChange, type WeeklyPoint } from "@/lib/weekly-trend";
type Scope="4"|"8"|"12"|"all";
const fmt=(n:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:0});
function WeeklyTooltip({active,payload}:{active?:boolean;payload?:Array<{payload?:WeeklyPoint}>}){
 const point=payload?.[0]?.payload;
 if(!active||!point)return null;
 return <div dir="rtl" className="max-w-[250px] rounded-xl border bg-card p-3 text-sm shadow-xl">
  <p className="font-bold">{point.label} <span className="font-normal text-muted-foreground">({point.from} — {point.to})</span></p>
  <p className="mt-2 text-base font-extrabold text-primary">ټول: {fmt(point.total)}</p>
  <p className="mt-1 text-xs text-muted-foreground">پاس شوي: {fmt(point.passed)} · مثنی: {fmt(point.duplicate)} · تجدید: {fmt(point.renewal)}</p>
 </div>;
}
export function WeeklyActivityChart(){
 const settings=useDashboardSettings();
 const q=useQuery(sheetQuery(["weekly"],settingsRefreshMs(settings)));
 const [scope,setScope]=useState<Scope>("8");
 const all=q.data?.tabs[0]?.grid?weeklyActivity(q.data.tabs[0].grid):[];
 const points=scope==="all"?all:all.slice(-Number(scope));
 const difference=weeklyChange(points);
 const latest=points.at(-1);
 return <section className="dashboard-panel overflow-hidden" aria-labelledby="weekly-activity-title">
  <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5">
   <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
     <Activity aria-hidden="true" className="h-5 w-5"/>
    </div>
    <div>
     <h2 id="weekly-activity-title" className="text-lg font-extrabold">د کار عمومي وضعیت</h2>
     <p className="mt-0.5 text-xs leading-6 text-muted-foreground">هفته وار فعالیت · پاس شوي + مثنی + تجدید</p>
    </div>
   </div>
   <div role="group" aria-label="د ګراف د اونیو شمېر" className="flex flex-wrap gap-1 rounded-xl bg-muted/55 p-1">
    {([["4","۴ اونۍ"],["8","۸ اونۍ"],["12","۱۲ اونۍ"],["all","ټول کال"]] as const).map(([key,label])=>
     <button key={key} type="button" aria-pressed={scope===key} onClick={()=>setScope(key)}
      className={"min-h-10 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary "+
       (scope===key?"bg-card text-primary shadow-sm":"text-muted-foreground hover:bg-card/70")}>{label}</button>)}
   </div>
  </div>
  {q.error&&<p role="alert" className="m-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorText(q.error)}</p>}
  {q.isLoading&&<p className="px-5 py-12 text-center text-muted-foreground" role="status">د هفته وار راپور ارقام اخیستل کېږي…</p>}
  {!q.isLoading&&!q.error&&points.length===0&&<p className="px-5 py-12 text-center text-sm text-muted-foreground">د هفته وار راپور د تایید وړ شمېرې ونه موندل شوې. د شیټ د کالمونو او معلوماتو حالت وګورئ.</p>}
  {!q.isLoading&&!q.error&&points.length>0&&<>
   <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 sm:px-5">
    <div><p className="text-xs text-muted-foreground">د وروستۍ ثبت شوې اونۍ فعالیت</p><p className="mt-0.5 text-2xl font-extrabold tabular-nums text-primary">{fmt(latest!.total)}</p></div>
    {difference!==null&&<div className={"flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold "+(difference>0?"bg-emerald-500/10 text-emerald-800":difference<0?"bg-amber-500/10 text-amber-800":"bg-muted text-foreground")}>
      {difference>0?<TrendingUp aria-hidden="true" className="h-4 w-4"/>:difference<0?<TrendingDown aria-hidden="true" className="h-4 w-4"/>:<Minus aria-hidden="true" className="h-4 w-4"/>}
      {difference>0?"+":""}{fmt(difference)}٪ د مخکینۍ ثبت شوې اونۍ په پرتله
    </div>}
   </div>
   <div dir="ltr" aria-label="د اونیو د فعالیت ټرېنډ" role="img" className="h-[260px] w-full min-w-0 px-2 pb-3 pt-4 sm:h-[330px] sm:px-4">
    <ResponsiveContainer width="100%" height="100%">
     <AreaChart data={points} margin={{top:12,right:20,left:-16,bottom:8}}>
      <defs><linearGradient id="barchiWeeklyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.28}/><stop offset="95%" stopColor="#0d9488" stopOpacity={0.02}/></linearGradient></defs>
      <CartesianGrid strokeDasharray="4 5" stroke="var(--border)" vertical={false}/>
      <XAxis dataKey="week" tickFormatter={n=>"W"+n} tick={{fontSize:11,fill:"var(--muted-foreground)"}} tickLine={false} axisLine={false} minTickGap={14}/>
      <YAxis tick={{fontSize:11,fill:"var(--muted-foreground)"}} tickLine={false} axisLine={false} width={52} tickFormatter={n=>Intl.NumberFormat("en",{notation:"compact"}).format(n)} domain={[0,"auto"]}/>
      <Tooltip content={<WeeklyTooltip/>}/>
      <Area type="monotone" dataKey="total" name="عمومي فعالیت" stroke="#0f766e" strokeWidth={3} fill="url(#barchiWeeklyArea)" activeDot={{r:5,strokeWidth:2,stroke:"#fff"}} dot={points.length<=8?{r:3,fill:"#0f766e"}:false} isAnimationActive={false} connectNulls={false}/>
     </AreaChart>
    </ResponsiveContainer>
   </div>
   <p className="px-4 pb-4 text-xs leading-6 text-muted-foreground sm:px-5">د اصلي هفته وار Google Sheet ثبت شوې اونۍ ښودل کېږي؛ د رخصتیو یا نامکملو اونیو شمېرې نه اټکل کېږي. ګراف د ثبت شويو دوسیو د شمېر وضعیت ښيي، نه د کارمندانو د کیفیت درجه.</p>
  </>}
 </section>;
}
