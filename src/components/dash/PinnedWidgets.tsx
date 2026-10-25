import { useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, GripVertical, Lightbulb, ListTodo, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { yesterdayJalali } from "@/lib/jalali";
import { buildManagementAdvice } from "@/lib/management-advisor";
import { reorderWidgets, useWorkspace, type WidgetId } from "@/lib/workspace";
import { useAccountTodos } from "@/lib/use-account-todos";

const label:{[K in WidgetId]:string}={todo:"دندې",advice:"ورځنۍ مشوره"};
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

function AdviceContent(){
 const settings=useDashboardSettings();
 const query=useQuery(sheetQuery(["total","identity","control","distribution","bank","services","arrivals","annual"],settingsRefreshMs(settings)));
 const {todos,loading:todosLoading,loadError:todoError}=useAccountTodos();
 const yesterday=yesterdayJalali();
 const advice=query.data&&!todosLoading?buildManagementAdvice(query.data.tabs,todos,yesterday):null;
 const [showEvidence,setShowEvidence]=useState(false);
 return (
  <div className="space-y-3">
   <p className="text-xs text-muted-foreground">د مرکز ټولې برخې او دندې • د پرون {advice?.date??`${yesterday.y}/${String(yesterday.m).padStart(2,"0")}/${String(yesterday.d).padStart(2,"0")}`}</p>
   {query.error&&<p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{errorText(query.error)}</p>}
   {!query.error&&(query.isLoading||todosLoading)&&<p className="text-sm text-muted-foreground">د راپورونو او کارونو ګډ تحلیل کېږي…</p>}
   {todoError&&<p className="text-xs text-destructive">د شخصي دندو معلومات نه دي ترلاسه شوي. تحلیل کې یې برخه نشته.</p>}
   {advice&&<div className="space-y-3 rounded-xl border bg-muted/30 p-3">
    <div><p className="text-sm font-bold">{advice.title}</p><p className="mt-2 text-sm leading-7">{advice.recommendation}</p></div>
    <div className="rounded-lg border-s-4 border-primary bg-background p-3">
      <p className="text-xs font-bold text-primary">ستاسو لپاره یو عملي ګام</p>
      <p className="mt-1 text-sm leading-7">{advice.action}</p>
    </div>
    <button type="button" aria-expanded={showEvidence} onClick={()=>setShowEvidence(v=>!v)}
     className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
      {showEvidence?"د ارقامو تفصیل بند کړئ":"د تحلیل سرچینې او ارقام وګورئ"}
    </button>
    {showEvidence&&<div className="space-y-2 border-t pt-3 text-xs">
      <p className="font-semibold">ثبت شوي ارقام</p>
      {advice.evidence.length?advice.evidence.map(item=><p key={item}>{item}</p>):<p>د پرون تایید شوي ارقام نشته.</p>}
      <p className="pt-1 font-semibold">کارول شوې سرچینې</p>
      <p>{advice.coverage.join("، ")||"نشته"}</p>
      {advice.missing.length>0&&<p className="text-amber-700">نیمګړي یا ناموجود: {advice.missing.join("، ")}</p>}
    </div>}
   </div>}
   <p className="text-xs leading-6 text-muted-foreground">مشوره د مرکز د شته راپورونو او شخصي دندو له ګډ تحلیل څخه جوړیږي. دا مهال تحلیل د محلي قواعدو پر بنسټ دی؛ حقیقي AI ماډل او بهر ته د معلوماتو لېږل لا نه دي فعال شوي.</p>
  </div>
 );
}

/** Native mouse drag-and-drop with an accessible keyboard/touch reorder button. */
export function PinnedWidgets({ layout = "grid" }: { layout?: "grid" | "stacked" }) {
 const settings=useDashboardSettings();
 const {order}=useWorkspace();
 const [dragging,setDragging]=useState<WidgetId|null>(null);
 const visible=order.filter(id=>id==="todo"?settings.showTodo:settings.showAdvice);
 if(!visible.length)return null;
 return (
  <section aria-label="شخصي پن شوي مدیریتي برخې" className={layout === "stacked" ? "flex flex-col gap-4" : "grid items-start gap-3 lg:grid-cols-2"}>
   {visible.map(id=>(
    <article key={id} onDragOver={event=>event.preventDefault()}
     onDrop={event=>{event.preventDefault();if(dragging){reorderWidgets(dragging,id);}setDragging(null);}}
     className={"dashboard-panel min-w-0 p-4 transition-all sm:p-5 "+(dragging===id?"opacity-60 ring-2 ring-primary/20":"")}>
     <div className="mb-4 flex items-center gap-2">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{id==="todo"?<ListTodo className="h-5 w-5"/>:<Lightbulb className="h-5 w-5"/>}</div>
      <h2 className="flex-1 font-bold">{id==="todo"?"زما دندې":"زما مدیریتي سلاکار"}</h2>
      {visible.length>1&&<button type="button" onClick={()=>reorderWidgets(id,visible.find(x=>x!==id)!)} title="ځای بدل کړئ" aria-label={label[id]+" ځای بدل کړئ"} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><ArrowLeftRight className="h-4 w-4"/></button>}
      <div draggable onDragStart={event=>{event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",id);setDragging(id);}} onDragEnd={()=>setDragging(null)}
       title="د موږک په واسطه یې انتقال کړئ" aria-label={label[id]+" انتقال کړئ"} className="flex h-11 w-11 cursor-grab items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing">
       <GripVertical className="h-5 w-5"/>
      </div>
     </div>
     {id==="todo"?<TodoContent/>:<AdviceContent/>}
    </article>
   ))}
  </section>
 );
}
