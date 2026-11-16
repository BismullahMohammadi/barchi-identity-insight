import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPassedFiles } from '@/lib/passed-files.functions';
import { Button } from '@/components/ui/button';
const STAFF=['ټول کارمندان','عزیزالله الطاف','فاطمه علي رضایي','نېک ولي خان ایمان','محمد نبي بهزاد','محمد نسیم هاشمي'];
export function PassedFilesLookup(){
 const [date,setDate]=useState('1405-08-24');
 const [employee,setEmployee]=useState('ټول کارمندان');
 const [submitted,setSubmitted]=useState('1405-08-24');
 const report=useQuery({queryKey:['passed-files',submitted],queryFn:()=>getPassedFiles({data:{date:submitted}}),enabled:/^1[34]\d{2}-\d{2}-\d{2}$/.test(submitted),retry:false,staleTime:120000});
 const rows=(report.data?.rows??[]).filter(r=>employee==='ټول کارمندان'||r.employee===employee);
 return <section className="space-y-4" aria-label="د پاس شوو دوسیو لټون">
  <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
   <label className="space-y-1 text-sm"><span className="block">هجري شمسي نېټه</span><input className="h-10 rounded-md border bg-background px-3" value={date} onChange={e=>setDate(e.target.value)} placeholder="1405-08-24"/></label>
   <label className="space-y-1 text-sm"><span className="block">کارمند</span><select className="h-10 max-w-full rounded-md border bg-background px-3" value={employee} onChange={e=>setEmployee(e.target.value)}>{STAFF.map(n=><option key={n}>{n}</option>)}</select></label>
   <Button onClick={()=>setSubmitted(date.trim().replace(/\//g,'-'))}>لټون</Button>
  </div>
  {report.isLoading&&<p role="status">د پنځو شیټونو معلومات لوستل کېږي…</p>}
  {report.isError&&<p role="alert" className="text-destructive">د دوسیو لټون ناکام شو. د Google Sheets اتصال او نېټه وګورئ.</p>}
  {report.data&&<><div className="flex flex-wrap gap-3 text-sm"><span className="rounded-lg border p-3 font-semibold">موندل شوې دوسیې: {rows.length.toLocaleString('fa-AF')}</span><span className="rounded-lg border p-3">کتل شوي ټبونه: {report.data.scannedTabs.toLocaleString('fa-AF')}</span></div>
   {!!report.data.warnings.length&&<div role="alert" className="rounded-lg border border-amber-500/30 p-3 text-sm"><strong>د بشپړتیا خبرتیا:</strong> ځینې سرچینې په بشپړ ډول نه دي پلټل شوې؛ شمېر ممکن نیمګړی وي.<ul className="mt-2 list-disc pr-5">{report.data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
   <div className="overflow-x-auto rounded-xl border"><table className="w-full text-right text-sm"><thead className="bg-muted"><tr>{['شمېره','کارمند','نوم او تخلص','د پلار نوم','فامیلي کوډ','د پاس نېټه','اصلي قطار'].map(x=><th key={x} className="whitespace-nowrap p-3">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.sourceUrl} className="border-t"><td className="p-3">{i+1}</td><td className="whitespace-nowrap p-3">{r.employee}</td><td className="whitespace-nowrap p-3">{r.name}</td><td className="whitespace-nowrap p-3">{r.father}</td><td className="whitespace-nowrap p-3" dir="ltr">{r.familyCode}</td><td className="p-3">{r.date}</td><td className="p-3"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">شیټ</a></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">په لوستل شوو ټبونو کې دوسیه ونه موندل شوه.</td></tr>}</tbody></table></div>
  </>}
 </section>;
}
