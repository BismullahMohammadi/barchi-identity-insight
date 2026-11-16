import { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { JALALI_MONTHS } from '@/lib/jalali';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { getPassedFiles } from '@/lib/passed-files.functions';
import { Button } from '@/components/ui/button';
const STAFF=['ټول کارمندان','عزیزالله الطاف','فاطمه علي رضایي','نېک ولي خان ایمان','محمد نبي بهزاد','محمد نسیم هاشمي'];
export function PassedFilesLookup(){
 const [from,setFrom]=useState('1405-08-24');
 const [to,setTo]=useState('1405-08-24');
 const [firstPick,setFirstPick]=useState<string|null>(null);
 const [calendarOpen,setCalendarOpen]=useState(false);
 const [view,setView]=useState({year:1405,month:8});
 const [showDetails,setShowDetails]=useState(false);
 const [search,setSearch]=useState('');
 const [hasSearched,setHasSearched]=useState(false);
 const [employee,setEmployee]=useState('ټول کارمندان');
 const [submitted,setSubmitted]=useState({from:'1405-08-24',to:'1405-08-24',query:''});
 const report=useQuery({queryKey:['passed-files',submitted.from,submitted.to,submitted.query],queryFn:()=>getPassedFiles({data:submitted}),enabled:hasSearched&&submitted.from<=submitted.to,retry:false,staleTime:120000});
 const normalizedSearch=search.trim().toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,'');
 const rows=(report.data?.rows??[]).filter(r=>(Boolean(submitted.query)||employee==='ټول کارمندان'||r.employee===employee));
 const showWorkType=employee==='محمد نبي بهزاد'||(employee==='ټول کارمندان'&&rows.some(r=>r.employee==='محمد نبي بهزاد'));
 const incomplete=!!report.data?.warnings.length;
 const warningCount=report.data?.warnings.length??0;
 function moveMonth(delta:number){setView(v=>{const n=v.year*12+v.month-1+delta;return {year:Math.floor(n/12),month:((n%12)+12)%12+1};});}
 function chooseDay(day:number){const chosen=`${view.year}-${String(view.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(!firstPick){setFirstPick(chosen);setFrom(chosen);setTo(chosen);}else{setFrom(chosen<firstPick?chosen:firstPick);setTo(chosen<firstPick?firstPick:chosen);setFirstPick(null);setCalendarOpen(false);}}
 const days=view.month<=6?31:view.month<=11?30:30;
 const sum=(key:'familyForms'|'individualForms')=>rows.reduce((n,r)=>n+(r[key]??0),0);
 return <section dir="rtl" className="space-y-4" aria-label="د پاس شوو دوسیو لټون">
  <style>{`@media print { @page { size:A4 landscape; margin:10mm; } body * { visibility:hidden!important; } #passed-print,#passed-print * {visibility:visible!important;} #passed-print {position:absolute!important;inset:0!important;width:100%!important;background:white!important;color:black!important;} #passed-print .no-print,#passed-print .print-hide {display:none!important;} #passed-print table {width:100%!important;border-collapse:collapse!important;font-size:10px!important;} #passed-print th,#passed-print td {border:1px solid #777!important;padding:5px!important;color:black!important;} #passed-print thead {display:table-header-group!important;} #passed-print tr {break-inside:avoid!important;} #passed-print .overflow-x-auto {overflow:visible!important;} }`}</style>
  <div id="passed-print" className="space-y-4 rounded-xl bg-background p-2 print:p-0">
   <header className="hidden text-center print:block"><p className="text-xs font-medium">د افغانستان اسلامي امارت ـ د احصایې او معلوماتو ملي اداره</p><h2 className="text-lg font-bold">د دشت برچي د الکترونیکي تذکرو مرکز</h2><p className="font-semibold">د کنټرول برخې د پاس شوو دوسیو راپور</p><p className="text-sm">نېټه: {submitted.from.replace(/-/g,'/')} — {submitted.to.replace(/-/g,'/')} · کارمند: {employee}</p></header>
   <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
    <div className="space-y-1 text-sm"><span className="block">هجري شمسي نېټه</span><Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className="h-10 gap-2"><CalendarRange className="h-4 w-4"/>{from.replace(/-/g,'/')} — {to.replace(/-/g,'/')}</Button></PopoverTrigger><PopoverContent align="start" dir="rtl" className="w-[min(94vw,340px)] p-3"><div className="mb-3 flex items-center justify-between"><Button size="icon" variant="ghost" aria-label="مخکینۍ میاشت" onClick={()=>moveMonth(-1)}><ChevronRight className="h-4 w-4"/></Button><strong>{JALALI_MONTHS[view.month-1]} {view.year}</strong><Button size="icon" variant="ghost" aria-label="راتلونکې میاشت" onClick={()=>moveMonth(1)}><ChevronLeft className="h-4 w-4"/></Button></div><div className="grid grid-cols-7 gap-1">{Array.from({length:days},(_,i)=><button type="button" key={i} onClick={()=>chooseDay(i+1)} className={`h-9 rounded-md text-sm hover:bg-muted ${`${view.year}-${String(view.month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`>=from&&`${view.year}-${String(view.month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`<=to?'bg-primary text-primary-foreground':''}`}>{i+1}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">{firstPick?'اوس د پای نېټه وټاکئ':'د پیل او پای نېټې د ټاکلو لپاره دوه ورځې وټاکئ'}</p></PopoverContent></Popover></div>
    <label className="space-y-1 text-sm"><span className="block">کارمند</span><select className="h-10 max-w-full rounded-md border bg-background px-3" value={employee} onChange={e=>setEmployee(e.target.value)}>{STAFF.map(n=><option key={n}>{n}</option>)}</select></label>
    <label className="space-y-1 text-sm"><span className="block">د مراجع نوم یا فامیلي کوډ</span><input className="h-10 rounded-md border bg-background px-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="نوم یا کوډ ولیکئ"/></label>
    <Button disabled={report.isFetching} onClick={()=>{setHasSearched(true);setSubmitted({from,to,query:search.trim()});if(hasSearched&&submitted.from===from&&submitted.to===to&&submitted.query===search.trim())void report.refetch()}}>{report.isFetching?"لټون...":"لټون"}</Button>
    <Button variant="outline" disabled={!report.data||incomplete||report.isFetching} onClick={()=>window.print()}><Printer className="h-4 w-4"/> چاپ</Button>
   </div>
   {!hasSearched&&<p className="no-print text-sm text-muted-foreground">د ټاکلې مودې د دوسیو د کتلو لپاره «لټون» ووهئ.</p>}
   {report.isLoading&&<p role="status">د شیټونو معلومات لوستل کېږي…</p>}
   {report.isError&&<p role="alert" className="text-destructive">د دوسیو لټون ناکام شو؛ اتصال او نېټه وګورئ.</p>}
   {report.data&&<>
    {incomplete&&<div role="alert" className="no-print rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span>ځینې معلومات ونه لوستل شول ({warningCount} خبرتیاوې). راپور ممکن نیمګړی وي.</span><button type="button" className="font-medium underline" onClick={()=>setShowDetails(v=>!v)}>{showDetails?'تفصیل پټول':'تفصیل کتل'}</button></div>{showDetails&&<ul className="mt-2 max-h-36 list-disc overflow-auto pr-5 text-xs">{report.data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}</div>}
    <div className="overflow-x-auto rounded-lg border">
     <table className="w-full border-collapse text-right text-sm"><thead className="bg-muted"><tr>{['شمېره','د مراجع نوم او تخلص','د پلار نوم','فامیلي کوډ','ولایت','فامیلي فورم','انفرادي فورم',...(showWorkType?['د کار نوع']:[]),'کارمند','د پاس نېټه','اصلي شیټ'].map(h=><th key={h} className={`whitespace-nowrap border p-2 ${['کارمند','د پاس نېټه','اصلي شیټ'].includes(h)?'print-hide':''}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.sourceUrl} className="border-b"><td className="p-2">{i+1}</td><td className="p-2">{r.name}</td><td className="p-2">{r.father}</td><td className="p-2 font-mono" dir="ltr">{r.familyCode}</td><td className="p-2">{r.province||"—"}</td><td className="p-2">{r.familyForms??"—"}</td><td className="p-2">{r.individualForms??"—"}</td>{showWorkType&&<td className="p-2">{r.workType||"—"}</td>}<td className="p-2 print-hide">{r.employee}</td><td className="p-2 print-hide">{r.date.replace(/-/g,'/')}</td><td className="p-2 print-hide"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">کتل</a></td></tr>)}
       {!rows.length&&<tr><td colSpan={showWorkType?11:10} className="p-6 text-center">دوسیه ونه موندل شوه</td></tr>}</tbody>
      <tfoot><tr className="bg-muted font-bold"><td colSpan={5} className="border p-3">مجموعه ـ د پاس شوو دوسیو شمېر</td><td className="border p-3">{sum("familyForms")}</td><td className="border p-3">{sum("individualForms")}</td>{showWorkType&&<td className="border p-3"/>}<td colSpan={3} className="border p-3">{rows.length.toLocaleString('fa-AF')}{incomplete?' (نابشپړ)':''}</td></tr></tfoot>
     </table>
    </div>
    <p className="text-xs text-muted-foreground">کتل شوي ټبونه: {report.data.scannedTabs} · د سرچینې د اصلي ثبت مطابق د دوسیو شمېر</p>
   </>}
  </div>
 </section>;
}
