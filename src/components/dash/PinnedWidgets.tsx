import { useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, GripVertical, ClipboardCheck, ListTodo, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { yesterdayJalali } from "@/lib/jalali";
import {enableReportSound,disableReportSound,isReportSoundEnabled,useStaffCompletionMonitor} from "@/lib/staff-completion-alerts";
import {stateReportTsv,type StateReport} from "@/lib/state-report-copy";
import {toast} from "sonner";
import {WhatsAppReminderEditor} from "@/components/dash/WhatsAppReminderEditor";
import { reorderWidgets, useWorkspace, type WidgetId } from "@/lib/workspace";
import { useAccountTodos } from "@/lib/use-account-todos";

const label:{[K in WidgetId]:string}={todo:"دندې",advice:"د راپورونو بشپړتیا"};
function TodoContent() {
 const {todos,loading,loadError,writeError,migrationError,saving,add,toggle,remove,refresh}=useAccountTodos();
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const pending=todos.filter(t=>!t.done);
 return (
  <div className="space-y-3">
   <form className="flex gap-2" onSubmit={async event=>{
     event.preventDefault();
     if(!draft.trim())return;
     setError("");
     try {await add(draft.trim());setDraft("");}catch{setError("دنده ونه ساتل شوه؛ بیا هڅه وکړئ.");}
    }}>
    <Input value={draft} maxLength={180} onChange={event=>setDraft(event.target.value)} placeholder="نوې دنده ولیکئ" aria-label="نوې دنده" className="min-h-11 min-w-0 bg-background" />
    <Button type="submit" disabled={!draft.trim()||saving||!!loadError} size="icon" className="h-11 w-11 shrink-0" aria-label="دنده اضافه کړئ"><Plus className="h-4 w-4"/></Button>
   </form>
   {(loadError||writeError||migrationError||error) && (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
     {loadError?"د دندو له خوندي ذخیرې سره اړیکه ناکامه شوه. ":writeError||error?"وروستی بدلون نه دی خوندي شوی. ":""}
     {migrationError&&"د زړو دندو انتقال بشپړ نه شو؛ اصلي کاپي نه ده پاکه شوې."}
     <Button type="button" size="sm" variant="ghost" className="ms-1 h-7" onClick={()=>refresh()}>بیا هڅه</Button>
    </div>
   )}
   <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
    {loading&&<p className="py-3 text-center text-sm text-muted-foreground">دندې رااخیستل کېږي…</p>}
    {!loading&&!loadError&&todos.length===0&&<p className="py-5 text-center text-sm text-muted-foreground">تر اوسه دنده نه ده ثبت شوې.</p>}
    {todos.map(t=>(
     <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/35 px-3 py-2">
      <button type="button" disabled={saving} onClick={async()=>{try{await toggle(t.id,!t.done);}catch{setError("د حالت بدلون ونه ساتل شو.");}}}
       aria-label={t.done?"دنده بېرته پاتې کړئ":"دنده بشپړه کړئ"} aria-pressed={t.done}
       className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors "+(t.done?"bg-primary text-primary-foreground":"bg-card hover:border-primary")}>{t.done&&<Check className="h-4 w-4"/>}</button>
      <span className={"min-w-0 flex-1 break-words text-sm "+(t.done?"text-muted-foreground line-through":"")}>{t.title}</span>
      <button type="button" disabled={saving} onClick={async()=>{try{await remove(t.id);}catch{setError("دنده لرې نه شوه.");}}}
       aria-label="دنده لرې کړئ" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></button>
     </div>
    ))}
   </div>
   <p className="text-xs text-muted-foreground">{pending.length} پاتې دندې · ستاسو په خوندي حساب کې ساتل کېږي</p>
  </div>
 );
}

function SectionCompleteness({title,report}:{title:string;report:{
  sheet:string;status:string;submittedCount:number;totalCount:number;
  missing:{name:string;role:string;activities:string[]}[];message:string;
}}){
 return <section className="space-y-2 rounded-xl border bg-card p-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="font-bold">{title}</h3>
   <span className={report.status==="complete"?"text-emerald-700":report.status==="incomplete"?"text-amber-700":"text-muted-foreground"}>
    {report.status==="complete"?"بشپړ":report.status==="incomplete"?"نیمګړی":"نه دی تایید شوی"}
   </span>
  </div>
  <p className="text-xs text-muted-foreground">{report.sheet||"د میاشتې ټاب نه دی موندل شوی"} · {report.submittedCount} له {report.totalCount} کارمندانو</p>
  {report.status==="unavailable"&&<p role="status" className="text-sm text-amber-700">{report.message}</p>}
  {report.missing.map(person=><div key={person.name} className="rounded-lg border border-amber-200 bg-amber-50/50 p-2">
   <p className="text-sm font-semibold">{person.name}</p>
   <p className="mt-1 text-xs text-muted-foreground">{person.role} · {person.activities.join("، ")}</p>
  </div>)}
 </section>;
}
function StateReportCopy({report}:{report:StateReport}){
 const [copied,setCopied]=useState(false);
 const copy=async()=>{
  if(report.status!=="available")return;
  const values=stateReportTsv(report);
  if(!values)return;
  try{
   // One value per row. Pasting into a spreadsheet fills exactly one column.
   // Avoid HTML tables because some spreadsheets would also paste headers/labels.
   await navigator.clipboard.writeText(values);
   setCopied(true);
   toast.success("یوازې ارقام کاپي شول.");
  }catch{
   toast.error("کاپي ونه شوه؛ د Clipboard اجازه ورکړئ.");
  }
 };
 return <section className="space-y-3 rounded-xl border bg-card p-3">
  <h3 className="font-bold">ریاست ته ګزارش</h3>
  {report.status!=="available" ? <p className="text-sm text-amber-700">{report.message}</p> :
   copied ? <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800">
     <Check aria-hidden="true" className="h-4 w-4"/> ارقام کاپي شول، اوس یې په شیټ کې پیسټ کړئ.
    </div> :
    <Button type="button" onClick={copy} className="w-full">د ریاست د ګزارش ارقام کاپي کړئ</Button>}
 </section>;
}
function ReportHealthContent(){
 const query=useStaffCompletionMonitor();
 const [soundEnabled,setSoundEnabled]=useState(isReportSoundEnabled);
 const [soundError,setSoundError]=useState("");
 const report=query.data;
 return <div className="space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <p className="text-xs text-muted-foreground">د دواړو مدیریتونو د تېرې ورځې راپورونه</p>
   <button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"
    onClick={async()=>{
     if(soundEnabled){disableReportSound();setSoundEnabled(false);return;}
     const ok=await enableReportSound();setSoundEnabled(ok);setSoundError(ok?"":"براوزر د غږ اجازه نه ورکوي.");
    }}>
    {soundEnabled?<Volume2 aria-hidden="true" className="h-4 w-4"/>:<VolumeX aria-hidden="true" className="h-4 w-4"/>}
    {soundEnabled?"غږ فعال دی":"د بشپړېدو غږ فعال کړئ"}
   </button>
  </div>
  {soundError&&<p role="alert" className="text-xs text-amber-700">{soundError}</p>}
  {query.error&&<div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
    {errorText(query.error)}
    <button type="button" className="ms-2 underline" onClick={()=>query.refetch()}>بیا هڅه وکړئ</button>
  </div>}
  {query.isLoading&&<p role="status" className="text-sm text-muted-foreground">د دواړو شیټونو راپورونه ارزول کېږي…</p>}
  {report&&<>
    <div className={"rounded-xl border p-3 "+(report.complete?"border-emerald-600/25 bg-emerald-600/10":"border-amber-600/25 bg-amber-600/10")}>
     <p className="text-sm font-extrabold">{report.complete?"دواړه مدیریتونه بشپړ دي":"د راپورونو بشپړتیا لا نه ده تایید شوې"}</p>
     <p className="mt-1 text-xs text-muted-foreground">د ارزول شوې ورځې نېټه: {report.date}</p>
    </div>
    <SectionCompleteness title="د نوم‌لیکنې او وېش مدیریت" report={report.registration}/>
    <SectionCompleteness title="د انسجام مدیریت" report={report.insijam}/>
    <WhatsAppReminderEditor registration={report.registration} insijam={report.insijam}/>
    {report.complete ? report.stateReport&&<StateReportCopy report={report.stateReport}/>:
      <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">د ریاست ګزارش کاپي کول به یوازې د دواړو مدیریتونو د راپورونو له بشپړېدو وروسته فعال شي.</p>}
  </>}
  <p className="text-xs leading-6 text-muted-foreground">د انسجام له ارزونې ۷ او ۸ قطارونه او د جاوید ملکزاد راپور ایستل شوي. صفر ثبت دی؛ تشه خانه نارسېدلی راپور ګڼل کېږي. ټول معلومات یوازې لوستل کېږي.</p>
 </div>;
}
/** Native mouse drag-and-drop with an accessible keyboard/touch reorder button. */
export function PinnedWidgets({ layout = "grid" }: { layout?: "grid" | "stacked" }) {
 const settings=useDashboardSettings();
 const {order}=useWorkspace();
 const [dragging,setDragging]=useState<WidgetId|null>(null);
 const visible=order.filter(id=>id==="todo"?settings.showTodo:settings.showReportHealth);
 if(!visible.length)return null;
 return (
  <section aria-label="شخصي پن شوي مدیریتي برخې" className={layout === "stacked" ? "flex flex-col gap-4" : "grid items-start gap-3 lg:grid-cols-2"}>
   {visible.map(id=>(
    <article key={id} onDragOver={event=>event.preventDefault()}
     onDrop={event=>{event.preventDefault();if(dragging){reorderWidgets(dragging,id);}setDragging(null);}}
     className={"dashboard-panel min-w-0 p-4 transition-all sm:p-5 "+(dragging===id?"opacity-60 ring-2 ring-primary/20":"")}>
     <div className="mb-4 flex items-center gap-2">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{id==="todo"?<ListTodo className="h-5 w-5"/>:<ClipboardCheck className="h-5 w-5"/>}</div>
      <h2 className="flex-1 font-bold">{id==="todo"?"زما دندې":"د راپورونو بشپړتیا"}</h2>
      {visible.length>1&&<button type="button" onClick={()=>reorderWidgets(id,visible.find(x=>x!==id)!)} title="ځای بدل کړئ" aria-label={label[id]+" ځای بدل کړئ"} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><ArrowLeftRight className="h-4 w-4"/></button>}
      <div draggable onDragStart={event=>{event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",id);setDragging(id);}} onDragEnd={()=>setDragging(null)}
       title="د موږک په واسطه یې انتقال کړئ" aria-label={label[id]+" انتقال کړئ"} className="flex h-11 w-11 cursor-grab items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing">
       <GripVertical className="h-5 w-5"/>
      </div>
     </div>
     {id==="todo"?<TodoContent/>:<ReportHealthContent/>}
    </article>
   ))}
  </section>
 );
}
