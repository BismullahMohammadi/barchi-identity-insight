import { useSectionActions } from "@/lib/dashboard-access-context";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getStaffReconciliation } from '@/lib/staff-reconciliation.functions';
import { JALALI_MONTHS, todayJalali } from '@/lib/jalali';
import { Button } from '@/components/ui/button';
import { RefreshCw, Printer } from 'lucide-react';

export const Route=createFileRoute('/_authenticated/dashboard/staff-reconciliation')({component:StaffReconciliationPage});
const display=(x:number|null)=>x===null?'—':x.toLocaleString('fa-AF');
function StaffReconciliationPage(){
  const can = useSectionActions("reconciliation");
 const today=todayJalali();
 const [year,setYear]=useState(today.y);
 const [month,setMonth]=useState(today.m);
 const [day,setDay]=useState<number|null>(null);
 const [onlyDifferences,setOnlyDifferences]=useState(false);
 const report=useQuery({queryKey:['staff-reconciliation',year,month],queryFn:()=>getStaffReconciliation({data:{year,month}}),staleTime:120000,retry:false});
 const rows=(report.data?.rows??[]).filter(r=>(day===null||r.day===day)&&(!onlyDifferences||r.status==='mismatch'));
 const count=(status:string)=>rows.filter(r=>r.status===status).length;
 return <main data-print-target dir="rtl" className="space-y-4 pb-8">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-bold">د کارکوونکو او تخنیکي راپورونو مطابقت</h1><p className="text-sm text-muted-foreground">تصدیق انفرادي (۴ کارمندان) او ثبت تولد (بهزاد)</p></div>
   <div className="flex flex-wrap gap-2 print:hidden">
    <Link to="/dashboard/reconciliation" className="rounded-lg border px-3 py-2 text-sm">عمومي مطابقت</Link>
    {can("print") && <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="h-4 w-4"/>چاپ</Button>}
    <Button variant="outline" size="icon" aria-label="تازه کول" onClick={()=>report.refetch()} disabled={report.isFetching}><RefreshCw className="h-4 w-4"/></Button>
   </div>
  </header>
  <div className="flex flex-wrap items-end gap-3 print:hidden">
   <label className="text-sm">کال <input aria-label="کال" type="number" min={1300} max={1499} value={year} onChange={e=>setYear(Number(e.target.value))} className="block h-10 w-24 rounded-md border bg-background px-2"/></label>
   <label className="text-sm">میاشت <select aria-label="میاشت" value={month} onChange={e=>{setMonth(Number(e.target.value));setDay(null);}} className="block h-10 rounded-md border bg-background px-2">{JALALI_MONTHS.map((name,i)=><option value={i+1} key={name}>{name}</option>)}</select></label>
   <label className="text-sm">ورځ <select aria-label="ورځ" value={day??''} onChange={e=>setDay(e.target.value?Number(e.target.value):null)} className="block h-10 rounded-md border bg-background px-2"><option value="">ټولې ورځې</option>{Array.from({length:month<=6?31:30},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
   <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)}/>یوازې توپیرونه</label>
  </div>
  {report.isLoading&&<p role="status">راپورونه لوستل کېږي…</p>}
  {(report.isError||report.data?.error)&&<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-destructive">د راپور معلومات ونه لوستل شول. د Google Sheets اړیکه او د میاشتې ټب وګورئ.</p>}
  {report.data?.tab&&<p className="text-xs text-muted-foreground">د کارمندانو ټب: {report.data.tab} · تخنیکي راپور: کنټرول کیفیت</p>}
  <div className="grid grid-cols-3 gap-2">{([['مطابق',count('equal')],['توپیر',count('mismatch')],['نیمګړي',count('missing')]] as const).map(([label,value])=><div key={label} className="rounded-xl border p-3 text-center"><p className="text-2xl font-bold">{display(value)}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
  <div className="grid grid-cols-1 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-3 print:hidden" role="tablist" aria-label="د مطابقت ډول">
   <Link to="/dashboard/reconciliation" search={{}} role="tab" aria-selected={false} className="flex min-h-10 items-center justify-center rounded-md px-2 text-center text-sm">د ورځو مطابقت</Link>
   <Link to="/dashboard/reconciliation" search={{}} role="tab" aria-selected={false} className="flex min-h-10 items-center justify-center rounded-md px-2 text-center text-sm">د توپیرونو مطابقت</Link>
   <span role="tab" aria-selected={true} className="flex min-h-10 items-center justify-center rounded-md bg-background px-2 text-center text-sm font-medium shadow-sm">د کارکوونکو او تخنیکي راپورونو مطابقت</span>
  </div>
  <div className="overflow-x-auto rounded-xl border bg-card" role="region" tabIndex={0} aria-label="د کارمندانو د ورځنیو توپیرونو جدول">
   <table className="w-full min-w-[850px] table-fixed border-collapse text-center text-[10px]">
    <thead><tr className="bg-muted"><th className="w-40 border p-2 text-right">کارمند</th>{Array.from({length:month<=6?31:30},(_,i)=>i+1).filter(d=>day===null||d===day).map(d=><th key={d} className="border p-1">{display(d)}</th>)}<th className="w-20 border p-1">د کارمند مجموعه</th><th className="w-20 border p-1">تخنیکي مجموعه</th><th className="w-20 border p-1">توپیر</th><th className="w-16 border p-1">توپیر لرونکې ورځې</th></tr></thead>
    <tbody>{['نېک ولي خان ایمان','محمد نسیم هاشمي','عزیزالله الطاف','فاطمه علي رضایي','محمد نبي بهزاد'].map(name=>{
     const personRows=rows.filter(r=>r.name===name);
     const valid=personRows.filter(r=>r.status!=='missing');
     const sum=(key:'reported'|'technical')=>valid.reduce((n,r)=>n+(r[key]??0),0);
     const a=sum('reported'),b=sum('technical');
     return <tr key={name}><th className="border bg-muted/30 p-2 text-right">{name}</th>{Array.from({length:month<=6?31:30},(_,i)=>i+1).filter(d=>day===null||d===day).map(d=>{
      const item=personRows.find(r=>r.day===d);
      return <td key={d} className={`border p-1 ${item?.status==='mismatch'?'bg-destructive/10 text-destructive':item?.status==='equal'?'bg-emerald-500/10 text-emerald-700':'bg-muted/30 text-muted-foreground'}`} title={item?.status==='missing'?'معلومات نشته':`کارمند: ${display(item?.reported??null)}، تخنیکي: ${display(item?.technical??null)}`}>{item?.status==='equal'?'✓':item?.status==='mismatch'?display(item.delta):'—'}</td>;
     })}<td className="border p-2">{valid.length?display(a):'—'}</td><td className="border p-2">{valid.length?display(b):'—'}</td><td className="border p-2 font-semibold">{valid.length?display(a-b):'—'}</td><td className="border p-2 text-destructive">{display(personRows.filter(r=>r.status==='mismatch').length)}</td></tr>;
    })}</tbody>
    <tfoot><tr className="bg-muted font-bold"><th className="border p-2 text-right">د ورځنیو توپیرونو شمېر</th>{Array.from({length:month<=6?31:30},(_,i)=>i+1).filter(d=>day===null||d===day).map(d=><td key={d} className="border p-1">{display(rows.filter(r=>r.day===d&&r.status==='mismatch').length)}</td>)}<td colSpan={3} className="border p-2">یوازې د دواړو سرچینو موجودې شمېرې جمع شوي</td><td className="border p-2">{display(count('mismatch'))}</td></tr></tfoot>
   </table>
  </div>
  <p className="text-xs text-muted-foreground">✓ برابر، سور عدد د کارمند د راپور او تخنیکي راپور توپیر دی، او — د معلوماتو نشتوالی ښيي. مجموعه یوازې د هغو ورځو لپاره محاسبه کېږي چې دواړه شمېرې موجودې وي.</p>
 </main>;
}
