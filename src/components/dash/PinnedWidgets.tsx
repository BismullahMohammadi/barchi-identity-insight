import { useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, GripVertical, Lightbulb, ListTodo, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { yesterdayJalali } from "@/lib/jalali";
import { buildYesterdayAdvice } from "@/lib/daily-advice";
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
    <Input value={draft} maxLength={180} onChange={event=>setDraft(event.target.value)} placeholder="نوې دنده ولیکئ" aria-label="نوې دنده" className="min-w-0 bg-background" />
    <Button type="submit" disabled={!draft.trim()||saving||!!loadError} size="icon" aria-label="دنده اضافه کړئ"><Plus className="h-4 w-4"/></Button>
   </form>
   {(loadError||writeError||migrationError||error) && (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
     {loadError?"د دندو له خوندي ذخیرې سره اړیکه ناکامه شوه. ":writeError||error?"وروستی بدلون نه دی خوندي شوی. ":""}
     {migrationError&&"د زړو دندو انتقال بشپړ نه شو؛ اصلي کاپي نه ده پاکه شوې."}
     <Button type="button" size="sm" variant="ghost" className="ms-1 h-7" onClick={()=>refresh()}>بیا هڅه</Button>
    </div>
   )}
   <div className="max-h-52 space-y-1.5 overflow-y-auto">
    {loading&&<p className="py-3 text-center text-sm text-muted-foreground">دندې رااخیستل کېږي…</p>}
    {!loading&&!loadError&&todos.length===0&&<p className="py-5 text-center text-sm text-muted-foreground">تر اوسه دنده نه ده ثبت شوې.</p>}
    {todos.map(t=>(
     <div key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2">
      <button type="button" disabled={saving} onClick={async()=>{try{await toggle(t.id,!t.done);}catch{setError("د حالت بدلون ونه ساتل شو.");}}}
       aria-label={t.done?"دنده بېرته پاتې کړئ":"دنده بشپړه کړئ"} aria-pressed={t.done}
       className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors "+(t.done?"bg-primary text-primary-foreground":"bg-card hover:border-primary")}>{t.done&&<Check className="h-4 w-4"/>}</button>
      <span className={"min-w-0 flex-1 break-words text-sm "+(t.done?"text-muted-foreground line-through":"")}>{t.title}</span>
      <button type="button" disabled={saving} onClick={async()=>{try{await remove(t.id);}catch{setError("دنده لرې نه شوه.");}}}
       aria-label="دنده لرې کړئ" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></button>
     </div>
    ))}
   </div>
   <p className="text-xs text-muted-foreground">{pending.length} پاتې دندې · ستاسو په خوندي حساب کې ساتل کېږي</p>
  </div>
 );
}

function AdviceContent(){
 const settings=useDashboardSettings();
 const query=useQuery(sheetQuery(["total","control","distribution"],settingsRefreshMs(settings)));
 const yesterday=yesterdayJalali();
 const advice=query.data?buildYesterdayAdvice(query.data.tabs,yesterday):null;
 return (
  <div className="space-y-3">
   <p className="text-xs text-muted-foreground">د پرون مدیریت • {advice?.date??`${yesterday.y}/${String(yesterday.m).padStart(2,"0")}/${String(yesterday.d).padStart(2,"0")}`}</p>
   {query.error&&<p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{errorText(query.error)}</p>}
   {!query.error && query.isLoading&&<p className="text-sm text-muted-foreground">د پرون راپور ارزول کېږي…</p>}
   {advice&&<div className="rounded-lg bg-muted/40 p-3">
     <p className="font-semibold">{advice.title}</p>
     <p className="mt-1 text-sm leading-7">{advice.message}</p>
     {advice.comparison&&<p className="mt-2 text-xs text-muted-foreground">{advice.comparison}</p>}
    </div>}
   <p className="text-xs text-muted-foreground">دا مشوره د شته راپورونو پر بنسټ د خوندي تحلیلي قواعدو له لارې جوړېږي؛ بهرني AI ته معلومات نه لېږل کېږي.</p>
  </div>
 );
}
/** Native mouse drag-and-drop with an accessible keyboard/touch reorder button. */
export function PinnedWidgets() {
 const settings=useDashboardSettings();
 const {order}=useWorkspace();
 const [dragging,setDragging]=useState<WidgetId|null>(null);
 const visible=order.filter(id=>id==="todo"?settings.showTodo:settings.showAdvice);
 if(!visible.length)return null;
 return (
  <section aria-label="شخصي پن شوي مدیریتي برخې" className="grid items-start gap-3 lg:grid-cols-2">
   {visible.map(id=>(
    <article key={id} onDragOver={event=>event.preventDefault()}
     onDrop={event=>{event.preventDefault();if(dragging){reorderWidgets(dragging,id);}setDragging(null);}}
     className={"min-w-0 rounded-2xl border bg-card p-4 shadow-card transition-all sm:p-5 "+(dragging===id?"opacity-60 ring-2 ring-primary/20":"")}>
     <div className="mb-4 flex items-center gap-2">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{id==="todo"?<ListTodo className="h-5 w-5"/>:<Lightbulb className="h-5 w-5"/>}</div>
      <h2 className="flex-1 font-bold">{id==="todo"?"زما دندې":"د پرون تحلیل او د نن مشوره"}</h2>
      {visible.length>1&&<button type="button" onClick={()=>reorderWidgets(id,visible.find(x=>x!==id)!)} title="ځای بدل کړئ" aria-label={label[id]+" ځای بدل کړئ"} className="rounded-md p-2 text-muted-foreground hover:bg-muted"><ArrowLeftRight className="h-4 w-4"/></button>}
      <div draggable onDragStart={event=>{event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",id);setDragging(id);}} onDragEnd={()=>setDragging(null)}
       title="د موږک په واسطه یې انتقال کړئ" aria-label={label[id]+" انتقال کړئ"} className="cursor-grab rounded-md p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing">
       <GripVertical className="h-5 w-5"/>
      </div>
     </div>
     {id==="todo"?<TodoContent/>:<AdviceContent/>}
    </article>
   ))}
  </section>
 );
}
