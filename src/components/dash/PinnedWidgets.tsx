import { useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, GripVertical, ClipboardCheck, ListTodo, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { yesterdayJalali } from "@/lib/jalali";
import {enableReportSound,disableReportSound,isReportSoundEnabled,useStaffCompletionMonitor} from "@/lib/staff-completion-alerts";
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

function ReportHealthContent(){
 const query=useStaffCompletionMonitor();
 const [soundEnabled,setSoundEnabled]=useState(isReportSoundEnabled);
 const [soundError,setSoundError]=useState("");
 const report=query.data;
 return <div className="space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <p className="text-xs text-muted-foreground">د ثبت نام، توزیع او وېش وروسته خدماتو د کارمندانو د پرون راپورونه</p>
   <button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"
    onClick={async()=>{
      if(soundEnabled){disableReportSound();setSoundEnabled(false);return;}
      const success=await enableReportSound();setSoundEnabled(success);
      setSoundError(success?"":"براوزر غږ نه فعالوي؛ د پاڼې غږ ته اجازه ورکړئ.");
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
  {query.isLoading&&<p role="status" className="text-sm text-muted-foreground">د پرون د کارمندانو راپورونه کتل کېږي…</p>}
  {report&&<div className="space-y-3">
   <div className={"rounded-xl border p-3 "+(report.status==="complete"?"border-emerald-600/25 bg-emerald-600/10":report.status==="incomplete"?"border-amber-600/25 bg-amber-600/10":"bg-muted/35")}>
    <p className="text-sm font-extrabold">{report.status==="complete"?"ټول راپورونه بشپړ دي":report.status==="incomplete"?"د کارمندانو راپورونه نیمګړي دي":"د راپور تایید ممکن نه دی"}</p>
    <p className="mt-1 text-xs leading-6">{report.message}</p>
    <p className="mt-2 text-xs text-muted-foreground">نېټه: {report.date} · میاشت: {report.sheet||"نه ده موندل شوې"}</p>
   </div>
   {report.status!=="unavailable"&&<p className="text-sm font-semibold tabular-nums">{report.submittedCount} له {report.totalCount} کارمندانو راپورونه ثبت کړي</p>}
   {report.missing.length>0&&<section aria-label="د نه رسېدلو راپورونو کارمندان" className="space-y-2">
     <h3 className="text-sm font-bold text-amber-800">د راپور نه وړاندې کوونکي کارمندان</h3>
     {report.missing.map(person=><div key={person.name} className="rounded-lg border bg-card p-3">
      <p className="text-sm font-bold">{person.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{person.role} · {person.activities.join("، ")}</p>
     </div>)}
   </section>}
   {report.status==="complete"&&<p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-800"> <Check aria-hidden="true" className="me-2 inline h-4 w-4"/> د پرون ټول راپورونه بشپړ شول!</p>}
  </div>}
  <p className="text-xs leading-6 text-muted-foreground">صفر ثبت شوی راپور ګڼل کېږي؛ تشې خانې بیا ارزول کېږي. د خبرتیا غږ یوازې له کاروونکي د فعالولو وروسته کار کوي او د براوزر له غږیزو اجازو سره تړاو لري. معلومات یوازې له خوندي Google Sheets اتصال څخه لوستل کېږي.</p>
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
