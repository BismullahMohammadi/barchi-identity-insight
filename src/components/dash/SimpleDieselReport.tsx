import {useQuery} from "@tanstack/react-query";
import {getDieselSheetReport} from "@/lib/diesel-sheet.functions";
export function SimpleDieselReport(){
 const q=useQuery({queryKey:["diesel-sheet-report"],queryFn:()=>getDieselSheetReport(),refetchInterval:120000});
 const d=q.data;
 const f=(n:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:2});
 return <main className="mx-auto max-w-6xl space-y-4">
 <header className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">د ډیزلو راپور</h1><p className="text-sm text-muted-foreground">سرچینه: Google Sheets — مصرف دیزل</p></div><button className="rounded-full border px-4 py-2" onClick={()=>q.refetch()} disabled={q.isFetching}>ریفریش</button></header>
 {q.isLoading&&<p>معلومات رااخیستل کېږي…</p>}{q.error&&<p role="alert">د شیټ معلومات ونه لوستل شول.</p>}
 {d&&<>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["مصرف",d.records.reduce((s,r)=>s+(r.consumedLiters??0),0)],["د جنراتور ساعتونه",d.records.reduce((s,r)=>s+(r.hours??0),0)],["راوړل شوي",d.deliveries.filter(x=>!x.isCarryover).reduce((s,x)=>s+x.liters,0)],["د تېر کال پاتې",d.deliveries.filter(x=>x.isCarryover).reduce((s,x)=>s+x.liters,0)]].map(([label,n])=><article key={String(label)} className="dashboard-panel p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{f(Number(n))}</p></article>)}</div>
 <section className="dashboard-panel p-4"><h2 className="font-bold">وروستۍ ثبت شوې فزیکي موجودي</h2><p className="text-xl font-bold">{d.reconciliation.physicalStock===null?"نامعلومه":f(d.reconciliation.physicalStock)+" لیتره"}</p><p className="text-sm text-muted-foreground">{d.reconciliation.physicalStockDate??"نېټه نه ده ثبت شوې"} — د نن ورځې موجودي نه ده</p></section>
 <section className="dashboard-panel overflow-x-auto p-4"><h2 className="mb-3 font-bold">میاشتنی مصرف</h2><table className="w-full min-w-[520px] text-sm"><thead><tr>{["میاشت","ساعتونه","لیتر/ساعت","مصرف","سند"].map(x=><th key={x} className="p-2 text-start">{x}</th>)}</tr></thead><tbody>{d.records.map(r=><tr key={r.code} className="border-t"><td className="p-2">{r.month}</td><td>{r.hours===null?"—":f(r.hours)}</td><td>{r.litersPerHour===null?"—":f(r.litersPerHour)}</td><td>{r.consumedLiters===null?"نه دی ثبت":f(r.consumedLiters)}</td><td>{r.document||"—"}</td></tr>)}</tbody></table></section>
 <section className="dashboard-panel overflow-x-auto p-4"><h2 className="mb-3 font-bold">راوړل شوي ډیزل</h2><table className="w-full min-w-[540px] text-sm"><thead><tr>{["نېټه","لیتره","بیه","مبلغ","سند"].map(x=><th key={x} className="p-2 text-start">{x}</th>)}</tr></thead><tbody>{d.deliveries.map(x=><tr key={x.sequence} className="border-t"><td className="p-2">{x.date||"—"}</td><td>{f(x.liters)}</td><td>{x.unitPrice===null?"—":f(x.unitPrice)}</td><td>{x.totalAmount===null?"نامعلوم":f(x.totalAmount)}</td><td>{x.document||x.note||"—"}</td></tr>)}</tbody></table></section>
 <p className="text-xs text-muted-foreground">دا یوازې د شیټ ثبتونه دي. د ۵۱۰ لیترو تسلیمي او د ۴۰۰ لیترو بیه جلا تایید غواړي. پخواني ثبتونه خوندي دي او په دې راپور کې نه جمع کېږي.</p>
 </>}
 </main>;
}
