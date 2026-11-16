import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getStaffReconciliation } from '@/lib/staff-reconciliation.functions';
import { JALALI_MONTHS } from '@/lib/jalali';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const names=['نېک ولي خان ایمان','محمد نسیم هاشمي','عزیزالله الطاف','فاطمه علي رضایي','محمد نبي بهزاد'];
const fmt=(n:number|null)=>n===null?'—':n.toLocaleString('fa-AF');
export function StaffReconciliationMatrix({year,month}:{year:number;month:number}){
 const [onlyDifferences,setOnlyDifferences]=useState(false);
 const [selected,setSelected]=useState<{day:number;name:string}|null>(null);
 const report=useQuery({queryKey:['staff-reconciliation',year,month],queryFn:()=>getStaffReconciliation({data:{year,month}}),staleTime:120000,retry:false,refetchOnWindowFocus:false});
 const rows=report.data?.rows??[];
 const allDays=Array.from({length:month<=6?31:30},(_,i)=>i+1);
 const days=onlyDifferences?allDays.filter(d=>rows.some(r=>r.day===d&&r.status==='mismatch')):allDays;
 const lookup=new Map(rows.map(r=>[`${r.name}:${r.day}`,r]));
 const detail=selected?lookup.get(`${selected.name}:${selected.day}`):null;
 return <section className="space-y-3" aria-label="د کارمندانو او تخنیکي راپورونو مطابقت">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 print:hidden">
   <div><h2 className="text-sm font-semibold">د کارمندانو او تخنیکي راپورونو د توپیرونو جدول</h2><p className="text-xs text-muted-foreground">{JALALI_MONTHS[month-1]} {fmt(year)} · {report.data?.tab??'د میاشتې راپور'}</p></div>
   <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)}/>یوازې توپیر لرونکې ورځې</label><Button variant="outline" size="icon" aria-label="تازه کول" disabled={report.isFetching} onClick={()=>void report.refetch()}><RefreshCw className={`h-4 w-4 ${report.isFetching?'animate-spin':''}`}/></Button></div>
  </div>
  {report.isLoading&&<p role="status" className="p-4">راپورونه لوستل کېږي…</p>}
  {(report.isError||report.data?.error)&&<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">د سرچینو معلومات ترلاسه نه شول. د میاشتې ټب او د Google Sheets لاسرسی وګورئ.</p>}
  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span>✓ برابر</span><span>سور عدد: توپیر (د کارمند راپور − تخنیکي راپور)</span><span>— معلومات نشته</span></div>
  <div className="max-w-full overflow-x-auto rounded-xl border bg-card shadow-sm" role="region" tabIndex={0} aria-label="د کارمندانو د توپیرونو میاشتنی جدول">
   <table className="w-full min-w-[780px] table-fixed border-collapse text-center text-[10px] leading-none">
    <thead><tr><th className="w-[140px] border border-border bg-muted p-2 text-right">کارمند / فعالیت</th>{days.map(d=><th key={d} className="border border-border bg-muted px-0 py-2">{fmt(d)}</th>)}{['د کارمند مجموعه','تخنیکي مجموعه','د مجموعې توپیر','د ورځنیو توپیرونو شمېر'].map(t=><th key={t} className="w-[75px] border border-border bg-secondary px-1 py-2 leading-4">{t}</th>)}</tr></thead>
    <tbody>{names.map((name,index)=>{
     const personRows=rows.filter(r=>r.name===name);
     const complete=personRows.filter(r=>r.status!=='missing');
     const employee=complete.reduce((s,r)=>s+(r.reported??0),0);
     const technical=complete.reduce((s,r)=>s+(r.technical??0),0);
     const differences=personRows.filter(r=>r.status==='mismatch').length;
     return <tr key={name} className={index%2?'bg-muted/20':'bg-card'}>
      <th className="border border-border p-2 text-right font-semibold">{name}<span className="block text-[9px] font-normal text-muted-foreground">{index===4?'ثبت تولد':'تصدیق انفرادی'}</span></th>
      {days.map(d=>{const r=lookup.get(`${name}:${d}`);const status=r?.status??'missing';return <td key={d} className="border border-border p-0"><button type="button" disabled={!r} onClick={()=>setSelected({name,day:d})} title={r?`کارمند: ${fmt(r.reported)}؛ تخنیکي: ${fmt(r.technical)}`:'معلومات نشته'} className={`min-h-7 w-full px-0 font-medium tabular-nums hover:ring-1 hover:ring-primary ${status==='mismatch'?'bg-destructive/10 text-destructive':status==='equal'?'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':'text-muted-foreground'}`}>{status==='equal'?'✓':status==='mismatch'?fmt(r?.delta??null):'—'}</button></td>;})}
      <td className="border border-border p-1 font-semibold">{complete.length?fmt(employee):'—'}</td><td className="border border-border p-1 font-semibold">{complete.length?fmt(technical):'—'}</td><td className={`border border-border p-1 font-semibold ${employee!==technical?'text-destructive':''}`}>{complete.length?fmt(employee-technical):'—'}</td><td className="border border-border p-1 font-semibold text-destructive">{fmt(differences)}</td>
     </tr>;
    })}</tbody>
    <tfoot><tr className="bg-muted font-bold"><th className="border border-border p-2 text-right">د ورځنیو توپیرونو شمېر</th>{days.map(d=><td key={d} className="border border-border p-1">{fmt(rows.filter(r=>r.day===d&&r.status==='mismatch').length)}</td>)}<td colSpan={3} className="border border-border p-2 text-xs text-muted-foreground">مجموعې یوازې د دواړو سرچینو له موجودو شمېرنو څخه</td><td className="border border-border p-1 text-destructive">{fmt(rows.filter(r=>r.status==='mismatch').length)}</td></tr></tfoot>
   </table>
  </div>
  {detail&&<div className="rounded-lg border p-4" aria-live="polite"><div className="mb-3 flex items-center justify-between"><strong>{selected?.name} — {selected?.day} {JALALI_MONTHS[month-1]}</strong><Button variant="ghost" size="sm" onClick={()=>setSelected(null)}>بندول</Button></div><div className="grid grid-cols-3 gap-2 text-center text-sm"><div>د کارمند راپور<strong className="block">{fmt(detail.reported)}</strong></div><div>تخنیکي راپور<strong className="block">{fmt(detail.technical)}</strong></div><div>توپیر<strong className="block">{fmt(detail.delta)}</strong></div></div></div>}
 </section>;
}
