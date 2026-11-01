import {parseJalali,jKey} from '@/lib/jalali';
import {useQuery} from "@tanstack/react-query";
import {getDieselSheetReport} from "@/lib/diesel-sheet.functions";
export function SimpleDieselReport(){
 const q=useQuery({queryKey:["diesel-sheet-report"],queryFn:()=>getDieselSheetReport({data:{nonce:Date.now()}}),refetchInterval:60000,refetchOnWindowFocus:true,refetchOnReconnect:true,staleTime:0,retry:1});
 const d=q.data;
 const f=(n:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:2});
 const deliveries=d?.deliveries??[];
 const allDelivered=deliveries.reduce((s,x)=>s+x.liters,0);
 const undated=deliveries.filter(x=>!x.isCarryover&&!x.date.trim());
 const undatedLiters=undated.reduce((s,x)=>s+x.liters,0);
 // Last 400L treated as after physical count based on user confirmation; other old deliveries excluded.
 const addedAfter=deliveries.filter(x=>{const dt=parseJalali(x.date);return !x.isCarryover&&dt!==null&&jKey(dt)>14050631;}).reduce((s,x)=>s+x.liters,0);
 const checkpoint=14050631;
 const laterMonths=(d?.records??[]).filter(r=>{const start=parseJalali(r.startDate);return start!==null&&jKey(start)>checkpoint;});
 const postConsumed=laterMonths.reduce((sum,r)=>sum+(r.consumedLiters??0),0);
 const physical=d?.reconciliation.physicalStock;
 const estimate=physical!==null&&physical!==undefined&&postConsumed!==null?physical+addedAfter-postConsumed:null;
 return <main className="mx-auto max-w-6xl space-y-4">
 <header className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">د ډیزلو راپور</h1><p className="text-sm text-muted-foreground">سرچینه: Google Sheets — مصرف دیزل</p></div><button className="rounded-full border px-4 py-2" onClick={()=>q.refetch()} disabled={q.isFetching}>{q.isFetching?"تازه کېږي…":"ریفریش"}</button></header>
 {d&&<p role="status" className="text-xs text-muted-foreground">{q.isFetching?"له Google Sheet څخه تازه کېږي…":`له شیټ سره وصل · وروستی تازه کول: ${new Intl.DateTimeFormat("ps-AF",{timeZone:"Asia/Kabul",hour:"2-digit",minute:"2-digit"}).format(new Date(d.fetchedAt))}`} · هره دقیقه اتومات تازه کېږي</p>}
 {q.isLoading&&<p>معلومات رااخیستل کېږي…</p>}{q.error&&<div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
 <p className="font-bold">د ډیزلو معلومات له Google Sheet څخه نه لوستل کېږي.</p>
 <p className="mt-1">{String(q.error).includes("SHEETS_NOT_CONNECTED")?"د Google Sheets اتصال یا د سرور اجازه فعاله نه ده.":String(q.error).includes("403")?"Google Sheets ته لاسرسی رد شوی؛ د اتصال اجازه بیا فعاله کړئ.":String(q.error).includes("401")?"د اتصال د تصدیق ستونزه ده.":String(q.error).includes("FORMAT_CHANGED")?"د «مصرف دیزل» ټیب جوړښت یا نوم بدل شوی دی.":String(q.error).includes("EMPTY")?"د شیټ هېڅ معلومات ترلاسه نه شول.":"د شبکې یا سرور د اړیکې ستونزه ده."}</p>
 <p className="mt-1 text-xs">د تېروتنې نښه: {String(q.error instanceof Error?q.error.message:q.error)}</p>
 <button type="button" className="mt-3 rounded-lg border border-current px-3 py-2 font-bold" onClick={()=>void q.refetch()}>بیا هڅه وکړئ</button>
 {d&&<p className="mt-2 text-xs">لاندې معلومات د وروستي بریالي اتصال دي.</p>}
 </div>}
 {d&&<>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["مصرف",d.records.reduce((s,r)=>s+(r.consumedLiters??0),0)],["د جنراتور ساعتونه",d.records.reduce((s,r)=>s+(r.hours??0),0)],["ټول راوړل شوي",allDelivered],["د تېر کال پاتې",d.deliveries.filter(x=>x.isCarryover).reduce((s,x)=>s+x.liters,0)]].map(([label,n])=><article key={String(label)} className="dashboard-panel p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{f(Number(n))}</p></article>)}</div>
 {undated.length>0&&<div role="status" className="rounded-xl border border-amber-400/60 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-200"><strong>نوي ډیزل له نیمګړو معلوماتو سره ثبت شوي:</strong> {f(undatedLiters)} لیتره ({undated.length} ثبتونه). په ټول راوړل شوي حساب کې شامل دي، خو تر هغې چې په Google Sheet کې یې نېټه نه وي ثبت شوې، د فزیکي موجودۍ وروسته حساب کې نه جمع کېږي.</div>}
 {laterMonths.length>0&&<p className="rounded-xl bg-muted/50 p-3 text-xs">د فزیکي شمېرنې وروسته ثبت شوی مصرف: {f(postConsumed)} لیتره ({laterMonths.filter(r=>r.consumedLiters!==null).map(r=>r.month).join("، ")})</p>}
 <section className="dashboard-panel border-primary/30 p-5"><h2 className="font-bold">له وروستۍ فزیکي شمېرنې وروسته اټکلي موجودي</h2>
 <p className="mt-2 text-3xl font-black">{estimate===null?"نامعلومه":f(estimate)+" لیتره"}</p>
 <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
  <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">فزیکي پیل</p><strong>{physical==null?"—":f(physical)} لیتره</strong></div>
  <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">وروسته راغلي</p><strong>+ {f(addedAfter)} لیتره</strong></div>
  <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">وروسته مصرف</p><strong>− {f(postConsumed)} لیتره</strong></div>
  <div className="rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">اټکلي پاتې</p><strong>{estimate===null?"—":f(estimate)} لیتره</strong></div>
 </div>
 <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p className="font-bold">د فزیکي شمېرنې وروسته د هرې میاشتې منفي شوی مصرف:</p>
 {laterMonths.filter(r=>r.consumedLiters!==null).map(r=><p key={r.code}>{r.month}: − {f(r.consumedLiters??0)} لیتره</p>)}
 </div>
 <p className="mt-2 text-xs text-muted-foreground">محاسبه د ۱۴۰۵/۰۶/۳۱ له ۴۹۷ لیترو څخه پیلېږي. له فزیکي شمېرنې وروسته د شیټ د نېټه لرونکو راوړنو مجموعه حساب شوې ده. د میزان او تر هغه وروسته هر ثبت شوی میاشتنی مصرف منفي کېږي. د لا نه ثبت شویو میاشتو مصرف صفر نه اټکل کېږي؛ دا د نن ورځې تایید شوې فزیکي موجودي نه ده.</p></section>
 <section className="dashboard-panel p-4"><h2 className="font-bold">وروستۍ ثبت شوې فزیکي موجودي</h2><p className="text-xl font-bold">{d.reconciliation.physicalStock===null?"نامعلومه":f(d.reconciliation.physicalStock)+" لیتره"}</p><p className="text-sm text-muted-foreground">{d.reconciliation.physicalStockDate??"نېټه نه ده ثبت شوې"} — د نن ورځې موجودي نه ده</p></section>
 <section className="dashboard-panel overflow-x-auto p-4"><h2 className="mb-3 font-bold">میاشتنی مصرف</h2><table className="w-full min-w-[520px] text-sm"><thead><tr>{["میاشت","ساعتونه","لیتر/ساعت","مصرف","سند"].map(x=><th key={x} className="p-2 text-start">{x}</th>)}</tr></thead><tbody>{d.records.map(r=><tr key={r.code} className="border-t"><td className="p-2">{r.month}</td><td>{r.hours===null?"—":f(r.hours)}</td><td>{r.litersPerHour===null?"—":f(r.litersPerHour)}</td><td>{r.consumedLiters===null?"نه دی ثبت":f(r.consumedLiters)}</td><td>{r.document||"—"}</td></tr>)}</tbody></table></section>
 <section className="dashboard-panel overflow-x-auto p-4"><h2 className="mb-3 font-bold">راوړل شوي ډیزل</h2><table className="w-full min-w-[540px] text-sm"><thead><tr>{["نېټه","لیتره","بیه","مبلغ","سند"].map(x=><th key={x} className="p-2 text-start">{x}</th>)}</tr></thead><tbody>{d.deliveries.map(x=><tr key={x.sequence} className="border-t"><td className="p-2">{x.date||"—"}</td><td>{f(x.liters)}</td><td>{x.unitPrice===null?"—":f(x.unitPrice)}</td><td>{x.totalAmount===null?"نامعلوم":f(x.totalAmount)}</td><td>{x.document||x.note||"—"}</td></tr>)}</tbody></table></section>
 <p className="text-xs text-muted-foreground">د ټولو راوړنو مجموعه د تېر کال ۷۰۰ او وروستي ۴۰۰ لیتره هم شمېري. پخواني ډیزل د ۴۹۷ لیترو له فزیکي شمېرنې سره بیا نه جمع کېږي. د ۵۱۰ لیترو تسلیمي او د ۴۰۰ لیترو بیه جلا تصفیه غواړي.</p>
 </>}
 </main>;
}
