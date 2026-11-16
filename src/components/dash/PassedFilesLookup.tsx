import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { getPassedFiles } from '@/lib/passed-files.functions';
import { Button } from '@/components/ui/button';
const STAFF=['ټول کارمندان','عزیزالله الطاف','فاطمه علي رضایي','نېک ولي خان ایمان','محمد نبي بهزاد','محمد نسیم هاشمي'];
export function PassedFilesLookup(){
 const [date,setDate]=useState('1405-08-24');
 const [employee,setEmployee]=useState('ټول کارمندان');
 const [submitted,setSubmitted]=useState('1405-08-24');
 const report=useQuery({queryKey:['passed-files',submitted],queryFn:()=>getPassedFiles({data:{date:submitted}}),enabled:/^1[34]\d{2}-\d{2}-\d{2}$/.test(submitted),retry:false,staleTime:120000});
 const rows=(report.data?.rows??[]).filter(r=>employee==='ټول کارمندان'||r.employee===employee);
 const incomplete=!!report.data?.warnings.length;
 const sum=(key:'familyForms'|'individualForms')=>rows.reduce((n,r)=>n+(r[key]??0),0);
 return <section dir="rtl" className="space-y-4" aria-label="د پاس شوو دوسیو لټون">
  <style>{`@media print { @page { size:A4 landscape; margin:10mm; } body * { visibility:hidden!important; } #passed-print,#passed-print * {visibility:visible!important;} #passed-print {position:absolute!important;inset:0!important;width:100%!important;background:white!important;color:black!important;} #passed-print .no-print {display:none!important;} #passed-print table {width:100%!important;border-collapse:collapse!important;font-size:10px!important;} #passed-print th,#passed-print td {border:1px solid #777!important;padding:5px!important;color:black!important;} #passed-print thead {display:table-header-group!important;} #passed-print tr {break-inside:avoid!important;} #passed-print .overflow-x-auto {overflow:visible!important;} }`}</style>
  <div id="passed-print" className="space-y-4 rounded-xl bg-background p-2 print:p-0">
   <header className="text-center"><p className="text-xs font-medium">د افغانستان اسلامي امارت ـ د احصایې او معلوماتو ملي اداره</p><h2 className="text-lg font-bold">د دشت برچي د الکترونیکي تذکرو مرکز</h2><p className="font-semibold">د کنټرول برخې د پاس شوو دوسیو راپور</p><p className="text-sm">نېټه: {submitted.replace(/-/g,'/')} · کارمند: {employee}</p></header>
   <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
    <label className="space-y-1 text-sm"><span className="block">هجري شمسي نېټه</span><input className="h-10 rounded-md border bg-background px-3" value={date} onChange={e=>setDate(e.target.value)} placeholder="1405-08-24"/></label>
    <label className="space-y-1 text-sm"><span className="block">کارمند</span><select className="h-10 max-w-full rounded-md border bg-background px-3" value={employee} onChange={e=>setEmployee(e.target.value)}>{STAFF.map(n=><option key={n}>{n}</option>)}</select></label>
    <Button onClick={()=>setSubmitted(date.trim().replace(/\//g,'-'))}>لټون</Button>
    <Button variant="outline" disabled={!report.data||incomplete||report.isFetching} onClick={()=>window.print()}><Printer className="h-4 w-4"/> چاپ</Button>
   </div>
   {report.isLoading&&<p role="status">د شیټونو معلومات لوستل کېږي…</p>}
   {report.isError&&<p role="alert" className="text-destructive">د دوسیو لټون ناکام شو؛ اتصال او نېټه وګورئ.</p>}
   {report.data&&<>
    {incomplete&&<div role="alert" className="rounded-lg border border-amber-500 p-3 text-sm"><strong>نا بشپړ راپور ـ چاپ بند دی.</strong><ul className="mt-1 list-disc pr-5">{report.data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
    <div className="overflow-x-auto rounded-lg border">
     <table className="w-full border-collapse text-right text-sm"><thead className="bg-muted"><tr>{['شمېره','د مراجع نوم او تخلص','د پلار نوم','فامیلي کوډ','ولایت','فامیلي فورم','انفرادي فورم','کارمند','د پاس نېټه','اصلي شیټ'].map(h=><th key={h} className="whitespace-nowrap border p-2">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.sourceUrl} className="border-b"><td className="p-2">{i+1}</td><td className="p-2">{r.name}</td><td className="p-2">{r.father}</td><td className="p-2 font-mono" dir="ltr">{r.familyCode}</td><td className="p-2">{r.province||"—"}</td><td className="p-2">{r.familyForms??"—"}</td><td className="p-2">{r.individualForms??"—"}</td><td className="p-2">{r.employee}</td><td className="p-2">{r.date.replace(/-/g,'/')}</td><td className="p-2"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">کتل</a></td></tr>)}
       {!rows.length&&<tr><td colSpan={10} className="p-6 text-center">دوسیه ونه موندل شوه</td></tr>}</tbody>
      <tfoot><tr className="bg-muted font-bold"><td colSpan={5} className="border p-3">مجموعه ـ د پاس شوو دوسیو شمېر</td><td className="border p-3">{sum("familyForms")}</td><td className="border p-3">{sum("individualForms")}</td><td colSpan={3} className="border p-3">{rows.length.toLocaleString('fa-AF')}{incomplete?' (نابشپړ)':''}</td></tr></tfoot>
     </table>
    </div>
    <p className="text-xs text-muted-foreground">کتل شوي ټبونه: {report.data.scannedTabs} · د سرچینې د اصلي ثبت مطابق د دوسیو شمېر</p>
   </>}
  </div>
 </section>;
}
