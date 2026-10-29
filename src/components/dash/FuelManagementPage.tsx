import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fuel, Plus, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFuelEntries, addFuelEntry, type FuelEntry } from "@/lib/fuel.functions";

const dateNow=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fmt=(n:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:2});
const types:Record<FuelEntry["kind"],string>={opening:"لومړنۍ موجودي",received:"ترلاسه شوي تېل",used:"مصرف شوي تېل"};
export function FuelManagementPage(){
 const qc=useQueryClient();
 const q=useQuery({queryKey:["fuel-entries"],queryFn:()=>getFuelEntries(),refetchInterval:60000});
 const [kind,setKind]=useState<FuelEntry["kind"]>("received");
 const [date,setDate]=useState(dateNow);
 const [liters,setLiters]=useState("");
 const [reference,setReference]=useState("");
 const [supplier,setSupplier]=useState("");
 const [hours,setHours]=useState("");
 const [note,setNote]=useState("");
 const [month,setMonth]=useState("all");
 const [error,setError]=useState("");
 const mutation=useMutation({mutationFn:addFuelEntry,onSuccess:async()=>{setLiters("");setHours("");setNote("");setReference("");setSupplier("");setError("");await qc.invalidateQueries({queryKey:["fuel-entries"]});},onError:(err)=>setError(String(err).includes("INSUFFICIENT_FUEL")?"د مصرف لپاره کافي تېل نشته.":"ثبت ناکام شو؛ د ډیټابېس اړیکه او معلومات وګورئ.")});
 const rows=q.data??[];
 const balance=rows.reduce((sum,x)=>sum+(x.kind==="used"?-x.liters:x.liters),0);
 const received=rows.filter(x=>x.kind!=="used").reduce((sum,x)=>sum+x.liters,0);
 const used=rows.filter(x=>x.kind==="used").reduce((sum,x)=>sum+x.liters,0);
 const options=useMemo(()=>[...new Set(rows.map(x=>x.entry_date.slice(0,7)))].sort().reverse(),[rows]);
 const filtered=month==="all"?rows:rows.filter(x=>x.entry_date.startsWith(month));
 const monthIn=filtered.filter(x=>x.kind!=="used").reduce((sum,x)=>sum+x.liters,0);
 const monthOut=filtered.filter(x=>x.kind==="used").reduce((sum,x)=>sum+x.liters,0);
 async function submit(e:React.FormEvent){e.preventDefault();setError("");const qty=Number(liters);if(!Number.isFinite(qty)||qty<=0){setError("د لیترو سمه اندازه ولیکئ.");return;}await mutation.mutateAsync({data:{kind,entry_date:date,liters:qty,reference_no:reference,supplier,generator_hours:hours?Number(hours):null,note}}).catch(()=>{});}
 function exportCsv(){
  const heading=["Date","Type","Liters","Reference","Supplier","Generator hours","Note"];
  const quote=(x:unknown)=>'"'+String(x??"").replace(/"/g,'""')+'"';
  const csv="\uFEFF"+[heading,...filtered.map(x=>[x.entry_date,types[x.kind],x.liters,x.reference_no,x.supplier,x.generator_hours,x.note])].map(line=>line.map(quote).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="fuel-ledger.csv";a.click();URL.revokeObjectURL(url);
 }
 return <div className="mx-auto max-w-6xl space-y-5 pb-8">
  <header><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Fuel className="h-7 w-7 text-primary"/>د تېلو او ډیزلو مدیریت</h1><p className="mt-1 text-sm text-muted-foreground">د مرکز د جنراتور تېل، مصرف او موجودي په لیترو کې</p></header>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[["ترلاسه شوي او لومړني تېل",received],["ټول مصرف",used],["اوسنۍ موجودي",balance],["د ټاکلې مودې مصرف",monthOut]].map(([label,value])=><div key={String(label)} className="dashboard-panel p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{fmt(Number(value))} <span className="text-xs font-medium">لیتره</span></p></div>)}
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
   <form onSubmit={submit} className="dashboard-panel space-y-3 p-4 sm:p-5">
    <h2 className="text-lg font-bold">د تېلو نوی ثبت</h2>
    <div><label className="mb-1 block text-sm">د ثبت ډول</label><Select value={kind} onValueChange={v=>setKind(v as FuelEntry["kind"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="opening">لومړنۍ موجودي</SelectItem><SelectItem value="received">ترلاسه شوي تېل</SelectItem><SelectItem value="used">مصرف شوي تېل</SelectItem></SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-3">
     <label className="text-sm">نېټه (میلادي)<Input required type="date" value={date} max={dateNow()} onChange={e=>setDate(e.target.value)}/></label>
     <label className="text-sm">لیتره<Input required type="number" min="0.01" step="0.01" value={liters} onChange={e=>setLiters(e.target.value)} placeholder="مثلاً 50"/></label>
    </div>
    <div className="grid grid-cols-2 gap-3">
     <label className="text-sm">د سند / رسید شمېره<Input maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></label>
     <label className="text-sm">عرضه کوونکی / مسؤل<Input maxLength={180} value={supplier} onChange={e=>setSupplier(e.target.value)}/></label>
    </div>
    <label className="block text-sm">د جنراتور کاري ساعتونه (اختیاري)<Input type="number" min="0" step="0.01" value={hours} onChange={e=>setHours(e.target.value)}/></label>
    <label className="block text-sm">یادښت<Textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="د مصرف دلیل یا نور معلومات"/></label>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={mutation.isPending} className="w-full"><Plus className="h-4 w-4"/>{mutation.isPending?"ثبتېږي…":"ثبتول"}</Button>
    <p className="text-xs text-muted-foreground">ثبتونه د حساب ورکونې لپاره له حذف او بدلون پرته ساتل کېږي. د اصلاح لپاره د مقابل ثبت طریقه وکاروئ.</p>
   </form>
   <section className="dashboard-panel min-w-0 space-y-3 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">د تېلو حساب او تاریخچه</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>q.refetch()} disabled={q.isFetching}><RefreshCw className="h-4 w-4"/>تازه</Button><Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4"/>CSV</Button></div></div>
    <div className="flex items-center gap-3"><label htmlFor="fuel-month" className="text-sm">د راپور موده</label><select id="fuel-month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="all">ټول ثبتونه</option>{options.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
    <p className="text-xs text-muted-foreground">په ټاکلې موده کې ترلاسه شوي: {fmt(monthIn)} لیتره؛ مصرف: {fmt(monthOut)} لیتره</p>
    {q.isLoading?<p className="text-sm text-muted-foreground">معلومات رااخیستل کېږي…</p>:q.error?<p role="alert" className="text-destructive">د تېلو ثبتونه ونه لوستل شول.</p>:filtered.length===0?<p className="rounded-lg bg-muted/40 p-6 text-center text-sm text-muted-foreground">تر اوسه ثبت نشته.</p>:
    <div className="max-h-[600px] space-y-2 overflow-y-auto">{filtered.map(x=><article key={x.id} className="rounded-xl border px-3 py-3">
     <div className="flex items-center justify-between gap-2"><strong className="text-sm">{types[x.kind]}</strong><span className="text-sm font-black">{x.kind==="used"?"−":"+"}{fmt(x.liters)} L</span></div>
     <p className="mt-1 text-xs text-muted-foreground">{x.entry_date} {x.reference_no?" • سند: "+x.reference_no:""}</p>
     {x.supplier&&<p className="mt-1 text-sm">مسؤل / عرضه کوونکی: {x.supplier}</p>}
     {x.generator_hours!==null&&<p className="text-xs">د جنراتور ساعتونه: {fmt(x.generator_hours)}</p>}
     {x.note&&<p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{x.note}</p>}
    </article>)}</div>}
   </section>
  </div>
 </div>;
}
