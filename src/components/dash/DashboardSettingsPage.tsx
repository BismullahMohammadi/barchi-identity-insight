import {SHEET_COLUMNS} from "@/lib/sheet-columns";
import {COLUMN_ALIAS_KEY,readAliases,type HeaderAliases} from "@/lib/sheet-mapping-preferences";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, ShieldCheck, Settings2, Monitor, LayoutDashboard, CalendarClock, Check, Info, ListTodo, Activity, Users, PanelsTopLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardSettings, saveDashboardSettings, resetDashboardSettings, type DashboardSettings } from "@/lib/dashboard-settings";
import { accessQuery } from "@/lib/queries";

type BooleanSetting = "showTodo" | "showReportHealth" | "showDailyVisitors" | "showCharts" | "compactCards";

function SettingRow({ id, title, description, checked, onChange, icon: Icon }: {
 id: BooleanSetting; title: string; description: string; checked: boolean; onChange: (value:boolean)=>void; icon: typeof Monitor;
}) {
 return <div className="flex flex-col gap-3 border-b border-border/60 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex min-w-0 items-start gap-3">
   <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true"/></span>
   <div className="min-w-0">
    <label htmlFor={id} className="cursor-pointer text-sm font-bold text-foreground">{title}</label>
    <p id={id+"-description"} className="mt-1 max-w-xl text-xs leading-6 text-muted-foreground">{description}</p>
   </div>
  </div>
  <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
   <span aria-hidden="true" className={"min-w-12 text-xs font-semibold "+(checked?"text-primary":"text-muted-foreground")}>{checked?"فعال":"غیرفعال"}</span>
   <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={id+"-description"} aria-label={title}/>
  </div>
 </div>;
}

export function DashboardSettingsPage() {
 const settings = useDashboardSettings();
 const access = useQuery(accessQuery);
 const queryClient = useQueryClient();
 const [refreshing,setRefreshing]=useState(false);
 const [resetConfirm,setResetConfirm]=useState(false);
 const [saved,setSaved]=useState(false);
 const [aliasSheet,setAliasSheet]=useState(Object.keys(SHEET_COLUMNS)[0]??"");
 const [aliases,setAliases]=useState<HeaderAliases>(readAliases);
 const [aliasSaved,setAliasSaved]=useState(false);
 function updateAlias(expected:string,newLabel:string){
  setAliases(prev=>({...prev,[aliasSheet]:{...(prev[aliasSheet]??{}),[expected]:newLabel}}));setAliasSaved(false);
 }
 function saveAliases(){
  try{window.localStorage.setItem(COLUMN_ALIAS_KEY,JSON.stringify(aliases));setAliasSaved(true);void queryClient.invalidateQueries({queryKey:["sheet"]});}catch{setAliasSaved(false);}
 }
 function update<K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) {
  saveDashboardSettings({ ...settings, [key]: value });
  setSaved(true);
 }
 async function refreshAll() {
  setRefreshing(true);
  try {
   await Promise.all(["sheet","daily-forms","daily-coordination","recent-referrals","problem-visitors","staff-report-completeness","insijam-report-completeness","state-report-yesterday"].map(queryKey=>queryClient.invalidateQueries({queryKey:[queryKey]})));
  } finally {setRefreshing(false);}
 }
 const displayRows: {id:BooleanSetting;title:string;description:string;icon:typeof Monitor}[]=[
  {id:"showDailyVisitors",title:"ورځني مراجعین",description:"د نوي معرفي شویو او ثبت‌نام ته معرفي شویو مراجعینو شمېرې او د وروستیو پنځو لېستونه.",icon:Users},
  {id:"showCharts",title:"ګرافونه او تحلیلي چارټونه",description:"د عمومي ډشبورډ ګرافونه ښکاره یا پټ کړئ.",icon:BarChart3},
  {id:"compactCards",title:"لنډ معلوماتي کارتونه",description:"د ډشبورډ معلوماتي کارتونه کوچني او منظم ښکاره کړئ.",icon:PanelsTopLeft},
  {id:"showTodo",title:"زما دندې",description:"د دندو د مدیریت برخه د «دندې او راپورونه» له لارې فعاله کړئ.",icon:ListTodo},
  {id:"showReportHealth",title:"د راپورونو بشپړتیا",description:"د تېرې ورځې د کارمندانو د راپورونو د بشپړتیا حالت وګورئ.",icon:Activity}
 ];
 return <div className="mx-auto max-w-5xl space-y-6 pb-10">
  <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-7">
   <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-primary/5" aria-hidden="true"/>
   <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
     <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Settings2 className="h-6 w-6"/></span>
     <div><h1 className="font-display text-2xl font-extrabold">د سیستم تنظیمات</h1>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">د ډشبورډ بڼه، د معلوماتو تازه کېدل او شخصي غوره‌توبونه تنظیم کړئ.</p></div>
    </div>
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
     <Check className="h-3.5 w-3.5"/>{saved?"بدلونونه خوندي شول":"بدلونونه په اتومات ډول خوندي کېږي"}
    </span>
   </div>
  </header>

  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
   <div className="min-w-0 space-y-5">
    <section className="dashboard-panel space-y-5 p-5 sm:p-6" aria-labelledby="settings-refresh-title">
     <div className="flex items-center gap-3 border-b border-border/60 pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-5 w-5"/></span>
      <div><h2 id="settings-refresh-title" className="font-extrabold">د معلوماتو تازه کول</h2><p className="mt-0.5 text-xs text-muted-foreground">د راپورونو د تازه کېدو وخت وټاکئ.</p></div>
     </div>
     <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="space-y-2"><label htmlFor="refresh-rate" className="text-sm font-semibold">د اتومات تازه کېدو موده</label>
       <Select value={String(settings.refreshSeconds)} onValueChange={value=>update("refreshSeconds",Number(value) as DashboardSettings["refreshSeconds"])}>
        <SelectTrigger id="refresh-rate" className="w-full"><SelectValue/></SelectTrigger>
        <SelectContent><SelectItem value="30">هر ۳۰ ثانیې</SelectItem><SelectItem value="60">هره ۱ دقیقه (اصلي)</SelectItem><SelectItem value="120">هرې ۲ دقیقې</SelectItem><SelectItem value="300">هرې ۵ دقیقې</SelectItem></SelectContent>
       </Select>
      </div>
      <Button variant="outline" onClick={refreshAll} disabled={refreshing} className="gap-2">
       <RefreshCw className={"h-4 w-4 "+(refreshing?"animate-spin":"")}/>{refreshing?"تازه کېږي…":"اوس تازه کړئ"}
      </Button>
     </div>
     <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0"/>معلومات یوازې هغه وخت په اتومات ډول تازه کېږي چې سیستم پرانیستی وي.</p>
    </section>

    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="settings-display-title">
     <div className="mb-5 flex items-center gap-3 border-b border-border/60 pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutDashboard className="h-5 w-5"/></span>
      <div><h2 id="settings-display-title" className="font-extrabold">د ډشبورډ ښودنه</h2><p className="mt-0.5 text-xs text-muted-foreground">هغه برخې وټاکئ چې په سیستم کې یې لیدل غواړئ.</p></div>
     </div>
     {displayRows.map(row=><SettingRow key={row.id} {...row} checked={settings[row.id]} onChange={v=>update(row.id,v)}/>)}
    </section>
   </div>

   <div className="space-y-5">
    <section className="dashboard-panel space-y-4 p-5" aria-label="د Google Sheets کالمونو تنظیمات">
     <div><h2 className="font-extrabold">د شیټ کالمونو نومونه</h2>
     <p className="mt-1 text-xs leading-6 text-muted-foreground">که د Google Sheet د کالم نوم بدل شي، دلته یې نوی نوم ولیکئ. ترتیب بدل شوي معلوم کالمونه په نوم پېژندل کېږي. دا تنظیم یوازې په همدې براوزر کې خوندي کېږي.</p></div>
     <label className="grid gap-1 text-sm font-bold">راپور
      <select className="h-10 rounded-lg border bg-background px-3" value={aliasSheet} onChange={e=>{setAliasSheet(e.target.value);setAliasSaved(false);}}>
       {Object.keys(SHEET_COLUMNS).filter(s=>s!=="ریاست ته ګزارش").map(s=><option key={s} value={s}>{s}</option>)}
      </select>
     </label>
     <div className="max-h-72 space-y-2 overflow-y-auto">
      {Object.values(SHEET_COLUMNS[aliasSheet]?.expectedHeaders??{}).map(expected=><label key={expected} className="grid gap-1 text-xs">
       <span className="font-semibold">{expected}</span>
       <input className="h-10 rounded-lg border bg-background px-3 text-sm" value={aliases[aliasSheet]?.[expected]??""} onChange={e=>updateAlias(expected,e.target.value)} placeholder="د شیټ نوی کالم نوم (که بدل شوی وي)"/>
      </label>)}
     </div>
     <Button onClick={saveAliases}>د کالمونو تنظیمات خوندي کړئ</Button>
     {aliasSaved&&<p role="status" className="text-xs text-primary">تنظیمات خوندي شول. راپور بیا تازه کړئ.</p>}
    </section>
    <section className="dashboard-panel space-y-4 p-5" aria-labelledby="settings-security-title">
     <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/><h2 id="settings-security-title" className="font-extrabold">حساب او امنیت</h2></div>
     <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ننوتلی حساب</p><p dir="ltr" className="mt-1 break-all text-start text-sm font-bold">{access.data?.email??"—"}</p></div>
     <div className="flex items-center justify-between gap-2 text-sm"><span>د لاسرسي حالت</span><span className={"rounded-full px-2 py-1 text-xs font-bold "+(access.data?.allowed?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>{access.data?.allowed?"تایید شوی":"نه دی تایید شوی"}</span></div>
     <p className="text-xs leading-6 text-muted-foreground">د حساب اجازې او د Google Sheets د اتصال کلۍ یوازې د سرور له لارې اداره کېږي.</p>
    </section>
    <section className="dashboard-panel space-y-3 p-5" aria-label="اصلي تنظیمات">
     <div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-primary"/><h2 className="font-extrabold">اصلي تنظیمات</h2></div>
     <p className="text-xs leading-6 text-muted-foreground">که غواړئ ټول شخصي غوره‌توبونه لومړني حالت ته وګرځوئ، لاندې تڼۍ وکاروئ.</p>
     {!resetConfirm?<Button variant="outline" className="w-full gap-2" onClick={()=>setResetConfirm(true)}><RotateCcw className="h-4 w-4"/>اصلي تنظیمات بېرته راوګرځوئ</Button>:
      <div className="space-y-2 rounded-xl border border-border p-3"><p className="text-sm font-semibold">ایا ډاډه یاست؟</p>
       <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={()=>{resetDashboardSettings();setResetConfirm(false);setSaved(true);}}>هو، بیا تنظیم کړئ</Button><Button size="sm" variant="outline" onClick={()=>setResetConfirm(false)}>لغوه</Button></div>
      </div>}
    </section>
   </div>
  </div>
 </div>;
}
