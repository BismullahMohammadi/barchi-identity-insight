import { useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, GripVertical, ClipboardCheck, ListTodo, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { yesterdayJalali } from "@/lib/jalali";
import { getReportHealth } from "@/lib/report-health";
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
 const settings=useDashboardSettings();
 const query=useQuery(sheetQuery(["total","identity","control","services","bank","distribution","arrivals","annual"],settingsRefreshMs(settings)));
 const yesterday=yesterdayJalali();
 const rows=query.data?getReportHealth(query.data.tabs,yesterday):[];
 const submitted=rows.filter(r=>r.state==="submitted").length;
 const dailyCount=rows.filter(r=>r.state!=="monthly").length;
 return <div className="space-y-3">
  <p className="text-sm text-muted-foreground">د پرون {yesterday.y}/{String(yesterday.m).padStart(2,"0")}/{String(yesterday.d).padStart(2,"0")} د راپورونو د ثبت وضعیت</p>
  {query.error&&<p role="alert" className="text-sm text-destructive">{errorText(query.error)}</p>}
  {query.isLoading&&<p className="text-sm text-muted-foreground">د راپورونو حالت اخیستل کېږي…</p>}
  {!query.isLoading&&!query.error&&<div className="rounded-xl border bg-muted/30 p-3">
   <p className="text-xl font-extrabold tabular-nums">{submitted} <span className="text-sm font-normal text-muted-foreground">له {dailyCount} ورځنیو راپورونو ثبت شوي</span></p>
   <div className="mt-3 space-y-2">
    {rows.map(r=><div key={r.slug} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
      <span>{r.name}</span>
      <span className={r.state==="submitted"?"font-semibold text-primary":r.state==="monthly"?"text-muted-foreground":"text-amber-700"}>
       {r.state==="submitted"?"ثبت شوی":r.state==="monthly"?"میاشتنی":r.state==="invalid"?"د کالمونو ستونزه":"نه دی موندل شوی"}
      </span>
     </div>)}
   </div>
  </div>}
  <p className="text-xs leading-6 text-muted-foreground">دا یوازې د راپور د ثبت حالت دی؛ د نشتوالي معنا د فعالیت صفر یا د کارمند تېروتنه نه ده.</p>
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
