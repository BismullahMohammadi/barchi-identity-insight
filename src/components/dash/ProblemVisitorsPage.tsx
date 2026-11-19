import { useSectionActions } from "@/lib/dashboard-access-context";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getProblemVisitors, changeProblemVisitor } from "@/lib/problem-visitors.functions";
import { ProblemVisitorAlerts } from "@/components/dash/ProblemVisitorAlerts";

export function ProblemVisitorsPage() {
 const can=useSectionActions("problem-visitors");
 const dashboard=useSectionActions("dashboard");
 const qc=useQueryClient();
 const [name,setName]=useState("");
 const [father,setFather]=useState("");
 const [issue,setIssue]=useState("");
 const q=useQuery({queryKey:["problem-visitors"],queryFn:()=>getProblemVisitors(),retry:false});
 const mutation=useMutation({mutationFn:changeProblemVisitor,onSuccess:async()=>{await qc.invalidateQueries({queryKey:["problem-visitors"]});}});
 async function add(e:React.FormEvent){e.preventDefault();await mutation.mutateAsync({data:{action:"add",full_name:name,father_name:father,issue}});setName("");setFather("");setIssue("");}
 return <div className="space-y-5">
  <div><h1 className="text-2xl font-extrabold">مشکلاتي مراجعین</h1><p className="mt-1 text-sm text-muted-foreground">یوازې د مدیر لپاره خصوصي لېست؛ ثبتونه د احتمالي تطابق لپاره کارېږي.</p></div>
  {dashboard("view") && <ProblemVisitorAlerts />}
  {can("create") && <form onSubmit={add} className="dashboard-panel grid gap-3 p-4 sm:p-5" aria-label="د مشکلاتي مراجع ثبت">
   <h2 className="font-bold">نوی مراجع ثبت کړئ</h2>
   <label className="grid gap-1 text-sm">نوم او تخلص<Input required maxLength={180} value={name} onChange={e=>setName(e.target.value)} /></label>
   <label className="grid gap-1 text-sm">د پلار نوم<Input required maxLength={180} value={father} onChange={e=>setFather(e.target.value)}/></label>
   <label className="grid gap-1 text-sm">د ستونزې تفصیل<Textarea required minLength={3} maxLength={2000} value={issue} onChange={e=>setIssue(e.target.value)}/></label>
   <Button type="submit" disabled={mutation.isPending}><Plus className="h-4 w-4"/> ثبتول</Button>
   {mutation.isError&&<p role="alert" className="text-sm text-destructive">د ثبت یا بدلون غوښتنه ناکامه شوه. د ډیټابېس تنظیمات او اجازه وګورئ.</p>}
  </form>}
  <section className="dashboard-panel p-4 sm:p-5"><h2 className="mb-3 font-bold">ثبت شوي مراجعین ({q.data?.length??0})</h2>
   {q.isLoading?<p>معلومات رااخیستل کېږي…</p>:q.error?<p role="alert" className="text-destructive">د لېست په ترلاسه کولو کې ستونزه ده. د ډیټابېس Migration وګورئ.</p>:q.data?.length===0?<p className="text-muted-foreground">تر اوسه مراجع نه دی ثبت شوی.</p>:
    <div className="space-y-3">{q.data?.map(v=><article key={v.id} className="rounded-xl border p-3">
     <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{v.full_name}</p><p className="text-sm text-muted-foreground">د پلار نوم: {v.father_name}</p></div><span className="text-xs">{v.status==="active"?"فعال":"حل شوی"}</span></div>
     <p className="mt-2 whitespace-pre-wrap text-sm">{v.issue}</p>
     <div className="mt-3 flex flex-wrap gap-2">
      {can("edit") && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={()=>mutation.mutate({data:{action:"status",id:v.id,status:v.status==="active"?"resolved":"active"}})}>{v.status==="active"?"حل شوی وټاکئ":"بیا فعال کړئ"}</Button>}
      {can("delete") && <Button size="sm" variant="destructive" disabled={mutation.isPending} onClick={()=>{if(window.confirm("دا ثبت حذف شي؟"))mutation.mutate({data:{action:"delete",id:v.id}});}}><Trash2 className="h-4 w-4"/> حذف</Button>}
     </div>
    </article>)}</div>}
  </section>
  <p className="flex gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4 shrink-0"/>د نوم او پلار نوم تطابق یوازې احتمالي نښه ده؛ د هویت تر تایید مخکې پرې اداري پرېکړه مه کوئ.</p>
 </div>;
}
