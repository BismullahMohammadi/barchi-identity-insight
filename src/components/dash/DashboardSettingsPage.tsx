import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Settings2,RefreshCw,RotateCcw,LayoutDashboard,Table2,FileSpreadsheet,ShieldCheck,Check,Activity,Users,BarChart3,PanelsTopLeft,ListTodo} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {useDashboardSettings,saveDashboardSettings,resetDashboardSettings,type DashboardSettings} from "@/lib/dashboard-settings";
import {SHEET_COLUMNS} from "@/lib/sheet-columns";
import {readAliases,COLUMN_ALIAS_KEY,type HeaderAliases} from "@/lib/sheet-mapping-preferences";
import {accessQuery} from "@/lib/queries";

type Section="general"|"reports"|"sheets"|"account";
const sections=[{id:"general",label:"عمومي",Icon:Settings2},{id:"reports",label:"راپورونه او جدولونه",Icon:Table2},{id:"sheets",label:"Google Sheets",Icon:FileSpreadsheet},{id:"account",label:"حساب او ساتنه",Icon:ShieldCheck}] as const;
export function DashboardSettingsPage(){
 const settings=useDashboardSettings();
 const access=useQuery(accessQuery);
 const qc=useQueryClient();
 const [tab,setTab]=useState<Section>("general");
 const [busy,setBusy]=useState(false),[resetConfirm,setResetConfirm]=useState(false);
 const [saved,setSaved]=useState(false);
 const [sheet,setSheet]=useState(Object.keys(SHEET_COLUMNS).find(s=>s!=="ریاست ته ګزارش")??"");
 const [aliases,setAliases]=useState<HeaderAliases>(readAliases);
 const [aliasSaved,setAliasSaved]=useState(false);
 function update<K extends keyof DashboardSettings>(key:K,value:DashboardSettings[K]){saveDashboardSettings({...settings,[key]:value});setSaved(true);}
 async function refreshAll(){setBusy(true);try{await Promise.all(["sheet","diesel-sheet-report","daily-forms","daily-coordination","recent-referrals","problem-visitors","staff-report-completeness","insijam-report-completeness","state-report-yesterday"].map(k=>qc.invalidateQueries({queryKey:[k]})));}finally{setBusy(false);}}
 function saveAliases(){try{window.localStorage.setItem(COLUMN_ALIAS_KEY,JSON.stringify(aliases));setAliasSaved(true);void qc.invalidateQueries({queryKey:["sheet"]});}catch{setAliasSaved(false);}}
 const flags=[{key:"showDailyVisitors",label:"ورځني مراجعین",Icon:Users},{key:"showCharts",label:"ګرافونه",Icon:BarChart3},{key:"compactCards",label:"کوچني کارتونه",Icon:PanelsTopLeft},{key:"showTodo",label:"زما دندې",Icon:ListTodo},{key:"showReportHealth",label:"د راپورونو بشپړتیا",Icon:Activity}] as const;
 return <div className="mx-auto max-w-6xl space-y-4 pb-10">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Settings2 className="h-6 w-6 text-primary"/>تنظیمات</h1><p className="text-xs text-muted-foreground">د سیستم تنظیمات په یوه ځای کې</p></div>
   {saved&&<span role="status" className="inline-flex items-center gap-1 text-xs text-primary"><Check className="h-4 w-4"/>خوندي شول</span>}
  </header>
  <nav className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-2 sm:grid-cols-4" aria-label="د تنظیماتو برخې">
   {sections.map(({id,label,Icon})=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}
    className={"flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition-colors sm:text-sm "+(tab===id?"bg-primary text-primary-foreground":"hover:bg-muted text-foreground")}>
    <Icon className="h-4 w-4"/>{label}</button>)}
  </nav>
  {tab==="general"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">عمومي تنظیمات</h2>
   <label className="grid max-w-sm gap-2 text-sm font-semibold">اتومات تازه کول
    <select value={String(settings.refreshSeconds)} onChange={e=>update("refreshSeconds",Number(e.target.value) as DashboardSettings["refreshSeconds"])} className="h-11 rounded-xl border bg-background px-3">
     {[30,60,120,300].map(n=><option key={n} value={n}>{n<60?n+" ثانیې":(n/60)+" دقیقې"}</option>)}
    </select>
   </label>
   <Button variant="outline" disabled={busy} onClick={refreshAll}><RefreshCw className={"h-4 w-4 "+(busy?"animate-spin":"")}/>{busy?"تازه کېږي…":"ټول معلومات تازه کړئ"}</Button>
  </section>}
  {tab==="reports"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">د راپورونو ښودنه</h2>
   <div className="divide-y divide-border/60">{flags.map(({key,label,Icon})=><div key={key} className="flex items-center justify-between gap-4 py-3">
    <label htmlFor={key} className="flex items-center gap-3 text-sm font-semibold"><Icon className="h-4 w-4 text-primary"/>{label}</label>
    <Switch id={key} checked={settings[key]} onCheckedChange={v=>update(key,v)}/>
   </div>)}</div>
   <div className="border-t pt-4"><label className="grid max-w-sm gap-2 text-sm font-semibold">په جدول کې د هرې پاڼې قطارونه
    <select value={settings.tablePageSize} onChange={e=>update("tablePageSize",Number(e.target.value) as DashboardSettings["tablePageSize"])} className="h-11 rounded-xl border bg-background px-3">
     {[10,20,50,100].map(n=><option key={n} value={n}>{n} قطارونه</option>)}
    </select>
   </label></div>
  </section>}
  {tab==="sheets"&&<section className="dashboard-panel space-y-4 p-4 sm:p-6">
   <div><h2 className="font-extrabold">د شیټ کالمونو نومونه</h2><p className="mt-1 text-xs text-muted-foreground">د بدل شوي کالم نوم لپاره نوی نوم ثبت کړئ.</p></div>
   <label className="grid max-w-md gap-2 text-sm font-semibold">راپور
    <select className="h-11 rounded-xl border bg-background px-3" value={sheet} onChange={e=>{setSheet(e.target.value);setAliasSaved(false);}}>
     {Object.keys(SHEET_COLUMNS).filter(s=>s!=="ریاست ته ګزارش").map(s=><option key={s} value={s}>{s}</option>)}
    </select>
   </label>
   <div className="grid gap-3 sm:grid-cols-2">{Object.values(SHEET_COLUMNS[sheet]?.expectedHeaders??{}).map(expected=><label key={expected} className="grid gap-1 text-xs font-semibold">{expected}
    <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="اوسنی نوم په شیټ کې" value={aliases[sheet]?.[expected]??""} onChange={e=>{setAliases(prev=>({...prev,[sheet]:{...(prev[sheet]??{}),[expected]:e.target.value}}));setAliasSaved(false);}}/>
   </label>)}</div>
   <div className="flex flex-wrap items-center gap-3"><Button onClick={saveAliases}>نومونه خوندي کړئ</Button>{aliasSaved&&<span role="status" className="text-xs text-primary">خوندي شول</span>}</div>
   <p className="text-xs text-muted-foreground">دا نومونه په همدې براوزر کې خوندي کېږي. د شیټ مهم عددي کالمونه مه حذفوئ.</p>
  </section>}
  {tab==="account"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">حساب او ساتنه</h2>
   <div className="rounded-xl bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">ننوتلی حساب</p><p dir="ltr" className="break-all text-start font-bold">{access.data?.email??"—"}</p></div>
   <div className="text-sm">د لاسرسي حالت: <strong>{access.data?.allowed?"تایید شوی":"نه دی تایید شوی"}</strong></div>
   <div className="border-t pt-4">{!resetConfirm?<Button variant="outline" onClick={()=>setResetConfirm(true)}><RotateCcw className="h-4 w-4"/>شخصي تنظیمات بېرته لومړني کړئ</Button>:
    <div className="flex flex-wrap items-center gap-2"><span className="text-sm">ټول شخصي تنظیمات بېرته وګرځي؟</span>
     <Button variant="destructive" onClick={()=>{resetDashboardSettings();setResetConfirm(false);setSaved(true);}}>تایید</Button>
     <Button variant="outline" onClick={()=>setResetConfirm(false)}>لغوه</Button>
    </div>}</div>
  </section>}
 </div>;
}
