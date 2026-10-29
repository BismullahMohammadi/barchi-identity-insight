import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fuel, Plus, RefreshCw, Download, BarChart3, ClipboardList, History, Info, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFuelEntries, addFuelEntry, type FuelEntry } from "@/lib/fuel.functions";
import { getDieselSheetReport } from "@/lib/diesel-sheet.functions";

const dateNow=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fmt=(n:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:2});
const types:Record<FuelEntry["kind"],string>={opening:"لومړنۍ موجودي",received:"ترلاسه شوي تېل",used:"مصرف شوي تېل"};
export function FuelManagementPage(){
 const qc=useQueryClient();
 const q=useQuery({queryKey:["fuel-entries"],queryFn:()=>getFuelEntries(),refetchInterval:60000});
 const diesel=useQuery({queryKey:["diesel-sheet-report"],queryFn:()=>getDieselSheetReport(),refetchInterval:120000});
 const [kind,setKind]=useState<FuelEntry["kind"]>("received");
 const [view,setView]=useState<"overview"|"sheet"|"register"|"history">("overview");
 const [date,setDate]=useState(dateNow);
 const [liters,setLiters]=useState("");
 const [reference,setReference]=useState("");
 const [supplier,setSupplier]=useState("");
 const [hours,setHours]=useState("");
 const [note,setNote]=useState("");
 const [month,setMonth]=useState("all");
 const [error,setError]=useState("");
 const mutation=useMutation({mutationFn:addFuelEntry,onSuccess:async()=>{setLiters("");setHours("");setNote("");setReference("");setSupplier("");setError("");await qc.invalidateQueries({queryKey:["fuel-entries"]});},onError:(err)=>setError(String(err).includes("INSUFFICIENT_FUEL")?"د مصرف لپاره کافي تېل نشته.":"ثبت ناکام شو؛ د ډیټابېس اړیکه او معلومات وګورئ.")});
 const dieselRecords=diesel.data?.records??[];
 const deliveries=diesel.data?.deliveries??[];
 const deliveredLiters=deliveries.filter(d=>!d.isCarryover).reduce((sum,d)=>sum+d.liters,0);
 const carriedLiters=deliveries.filter(d=>d.isCarryover).reduce((sum,d)=>sum+d.liters,0);
 const dieselTotal=dieselRecords.reduce((sum,r)=>sum+(r.consumedLiters??0),0);
 const dieselHours=dieselRecords.reduce((sum,r)=>sum+(r.hours??0),0);
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
  <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-primary">د مرکز د جنراتور حسابداري</p>
    <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold"><Fuel className="h-7 w-7 text-primary"/>د تېلو او ډیزلو مدیریت</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">د موجودۍ حساب، میاشتنی مصرف، نوي ثبتونه او د عملیاتو تاریخچه په جلا برخو کې.</p></div>
    <Button variant="outline" size="sm" onClick={()=>{void q.refetch();void diesel.refetch();}} disabled={q.isFetching||diesel.isFetching}><RefreshCw className={"h-4 w-4 "+(q.isFetching||diesel.isFetching?"animate-spin":"")}/>ټول تازه کړئ</Button></div>
  </header>
  <nav className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-2 sm:grid-cols-4" aria-label="د تېلو د مدیریت برخې">
   {([{id:"overview",label:"عمومي کتنه",Icon:BarChart3},{id:"sheet",label:"مصرف او راوړل",Icon:ClipboardList},{id:"register",label:"نوی ثبت",Icon:Plus},{id:"history",label:"تاریخچه",Icon:History}] as const).map(tab=>
    <button key={tab.id} type="button" aria-current={view===tab.id?"page":undefined} onClick={()=>setView(tab.id)}
     className={"flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary "+(view===tab.id?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-muted")}>
     <tab.Icon className="h-4 w-4"/>{tab.label}</button>)}
  </nav>
  {view==="overview"&&<section className="space-y-4" aria-label="د موجودۍ عمومي کتنه">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
     {([["لومړنۍ موجودي او ترلاسه شوي",received,ArrowDownToLine],["مصرف شوي تېل",used,ArrowUpFromLine],["اوسنۍ موجودي",balance,Fuel],["د ټاکلې مودې مصرف",monthOut,History]] as const).map(([label,value,Icon])=>
      <div key={label} className="dashboard-panel p-4 sm:p-5"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4"/><p className="text-xs">{label}</p></div>
      <p className="mt-3 text-2xl font-black tabular-nums">{q.isLoading?"…":fmt(value)} <span className="text-xs font-semibold">لیتره</span></p></div>)}
    </div>
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7"><Info className="ml-2 inline h-4 w-4 text-primary"/>
    موجودي یوازې د دې سیستم له ثبت شویو ترلاسه کولو او مصرفونو محاسبه کېږي. د Google Sheets تاریخي میاشتني مصرف پکې نه شاملېږي.
    که د لومړنۍ موجودۍ ثبت نه وي شوی، ښودل شوې موجودي د مرکز واقعي ذخیره نه ګڼل کېږي.</div>
    <div className="grid gap-3 sm:grid-cols-2">
     <button onClick={()=>setView("sheet")} className="dashboard-panel p-5 text-start hover:bg-muted/50"><p className="font-bold">د Google Sheets میاشتنی راپور</p><p className="mt-2 text-xl font-black">{diesel.isLoading?"…":fmt(dieselTotal)} لیتره</p><p className="mt-1 text-xs text-muted-foreground">ثبت شوی میاشتنی مصرف · د تفصیل لپاره کلیک وکړئ</p></button>
     <button onClick={()=>setView("register")} className="dashboard-panel p-5 text-start hover:bg-muted/50"><p className="font-bold">د تېلو نوی ثبت</p><p className="mt-2 text-sm text-muted-foreground">رسید، مصرف یا لومړنۍ موجودي اضافه کړئ</p></button>
    </div>
   </section>}
  {view==="sheet"&&<>
  <section className="dashboard-panel space-y-4 p-4 sm:p-5" aria-label="د Google Sheets د ډیزلو راپور">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div><h2 className="text-lg font-extrabold">د Google Sheets میاشتنی مصرف</h2>
     <p className="mt-1 text-xs text-muted-foreground">سرچینه: «مصرف دیزل» — د ۱۴۰۵ کال راپور؛ یوازې لوستل کېږي</p></div>
    <Button type="button" size="sm" variant="outline" onClick={()=>diesel.refetch()} disabled={diesel.isFetching}>
     <RefreshCw className={"h-4 w-4 "+(diesel.isFetching?"animate-spin":"")}/>تازه کول</Button>
   </div>
   {diesel.isLoading?<p className="text-sm text-muted-foreground">د Google Sheets معلومات رااخیستل کېږي…</p>:
    diesel.error?<p role="alert" className="text-sm text-destructive">د «مصرف دیزل» د ټیب معلومات ونه لوستل شول؛ د Google Sheets اتصال وګورئ.</p>:
    <><div className="grid grid-cols-2 gap-3">
     <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ثبت شوی ټول مصرف</p><p className="mt-1 text-xl font-extrabold">{fmt(dieselTotal)} لیتره</p></div>
     <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">د جنراتور ټول کاري ساعتونه</p><p className="mt-1 text-xl font-extrabold">{fmt(dieselHours)} ساعتونه</p></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[540px] border-collapse text-sm">
     <thead><tr className="border-b text-start text-xs text-muted-foreground"><th className="py-2 text-start">میاشت</th><th className="py-2 text-start">ساعتونه</th><th className="py-2 text-start">لیتر / ساعت</th><th className="py-2 text-start">مصرف (لیتره)</th><th className="py-2 text-start">د سند معلومات</th></tr></thead>
     <tbody>{dieselRecords.map(r=><tr key={r.code} className="border-b border-border/50">
      <td className="py-2">{r.month}</td><td>{r.hours===null?"—":fmt(r.hours)}</td><td>{r.litersPerHour===null?"—":fmt(r.litersPerHour)}</td>
      <td className="font-bold">{r.consumedLiters===null?"لا نه دی ثبت شوی":fmt(r.consumedLiters)}</td>
      <td className="max-w-[220px] break-words text-xs">{r.document||"—"}</td>
     </tr>)}</tbody></table></div>
    <p className="text-xs leading-6 text-muted-foreground">دا ارقام له Google Sheets څخه جلا راځي او د لاندې لاسي ترلاسه کولو/مصرف ثبتونو له موجودۍ سره نه جمع کېږي، څو مصرف دوه ځله حساب نه شي. د راتلونکو میاشتو بې‌ساعتونو صفرونه «لا نه دي ثبت شوي» ګڼل کېږي.</p></>}
  </section>
  <section className="dashboard-panel space-y-4 p-4 sm:p-5" aria-label="د راوړل شویو ډیزلو راپور">
   <div><h2 className="text-lg font-extrabold">راوړل شوي ډیزل</h2>
    <p className="mt-1 text-xs text-muted-foreground">د «مصرف دیزل» ټیب د راوړل شویو ډیزلو د محاسبې جدول — یوازې لوستل کېږي</p></div>
   {diesel.isLoading?<p className="text-sm text-muted-foreground">معلومات رااخیستل کېږي…</p>:diesel.error?<p className="text-sm text-destructive">د راوړل شویو ډیزلو معلومات ونه لوستل شول.</p>:<>
    <div className="grid grid-cols-2 gap-3">
     <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">د ۱۴۰۵ ثبت شوي راوړل شوي</p><p className="mt-1 text-xl font-extrabold">{fmt(deliveredLiters)} لیتره</p></div>
     <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">له ۱۴۰۴ کال پاتې ثبت</p><p className="mt-1 text-xl font-extrabold">{fmt(carriedLiters)} لیتره</p></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[750px] border-collapse text-sm">
     <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 text-start">ګڼه</th><th className="text-start">نېټه</th><th className="text-start">ډیزل (لیتره)</th><th className="text-start">د فی لیتر بیه</th><th className="text-start">مجموعي مبلغ</th><th className="text-start">سند</th><th className="text-start">یادښت</th></tr></thead>
     <tbody>{deliveries.map(d=><tr key={d.code+"-"+d.sequence} className="border-b border-border/50 align-top">
      <td className="py-2">{d.sequence}</td><td>{d.date||"—"}</td><td className="font-bold">{fmt(d.liters)}</td>
      <td>{d.unitPrice===null?"نامعلوم":fmt(d.unitPrice)}</td><td>{d.totalAmount===null?"نه دی محاسبه شوی":fmt(d.totalAmount)}</td>
      <td className="max-w-44 break-words text-xs">{d.document||"—"}</td>
      <td className="max-w-60 break-words text-xs">{[d.isCarryover?"د ۱۴۰۴ کال پاتې ډیزل":null,d.note,d.remaining].filter(Boolean).join(" — ")||"—"}</td>
     </tr>)}</tbody></table></div>
    <p className="text-xs leading-6 text-muted-foreground">دا جدول د Google Sheets اصلي ارقام او یادښتونه ښيي. نیمګړې بیې او غلط فورمولونه د صفر په توګه نه محاسبه کېږي. راوړل شوي لیترونه د لاسي موجودۍ حساب ته په اتومات ډول نه انتقالېږي؛ د توکو د تسلیمۍ او واقعي موجودۍ تایید جلا اړتیا لري.</p>
   </>}
  </section></>}
  {view==="register"&&<div className="mx-auto max-w-2xl"><form onSubmit={submit} className="dashboard-panel space-y-3 p-4 sm:p-5">
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
   </form></div>}
   {view==="history"&&<section className="dashboard-panel min-w-0 space-y-3 p-4 sm:p-5">
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
   </section>}
 </div>;
}
