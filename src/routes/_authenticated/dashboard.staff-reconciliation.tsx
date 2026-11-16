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
 const today=todayJalali();
 const [year,setYear]=useState(today.y);
 const [month,setMonth]=useState(today.m);
 const [day,setDay]=useState<number|null>(null);
 const [onlyDifferences,setOnlyDifferences]=useState(false);
 const report=useQuery({queryKey:['staff-reconciliation',year,month],queryFn:()=>getStaffReconciliation({data:{year,month}}),staleTime:120000,retry:false});
 const rows=(report.data?.rows??[]).filter(r=>(day===null||r.day===day)&&(!onlyDifferences||r.status==='mismatch'));
 const count=(status:string)=>rows.filter(r=>r.status===status).length;
 return <main dir="rtl" className="space-y-4 pb-8">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-bold">د کارمندانو او تخنیکي راپورونو مطابقت</h1><p className="text-sm text-muted-foreground">تصدیق انفرادي (۴ کارمندان) او ثبت تولد (بهزاد)</p></div>
   <div className="flex flex-wrap gap-2 print:hidden">
    <Link to="/dashboard/reconciliation" className="rounded-lg border px-3 py-2 text-sm">عمومي مطابقت</Link>
    <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="h-4 w-4"/>چاپ</Button>
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
  {report.data?.tab&&<p className="text-xs text-muted-foreground">د کارمندانو ټب: {report.data.tab} · تخنیکي ټب: کنټرول</p>}
  <div className="grid grid-cols-3 gap-2">{([['مطابق',count('equal')],['توپیر',count('mismatch')],['نیمګړي',count('missing')]] as const).map(([label,value])=><div key={label} className="rounded-xl border p-3 text-center"><p className="text-2xl font-bold">{display(value)}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
  <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-muted"><tr>{['ورځ','کارمند','فعالیت','د کارمند راپور','تخنیکي راپور','توپیر','حالت'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.day+':'+r.name} className="border-t"><td className="p-2">{r.day}</td><td className="p-2">{r.name}</td><td className="p-2">{r.activity}</td><td className="p-2">{display(r.reported)}</td><td className="p-2">{display(r.technical)}</td><td className="p-2" dir="ltr">{display(r.delta)}</td><td className={`p-2 ${r.status==='mismatch'?'text-destructive':r.status==='equal'?'text-emerald-700':'text-muted-foreground'}`}>{r.status==='equal'?'مطابق':r.status==='mismatch'?'توپیر':'معلومات نشته'}</td></tr>)}{!rows.length&&!report.isLoading&&<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">د ټاکلي فلټر لپاره معلومات نشته.</td></tr>}</tbody></table></div>
 </main>;
}
