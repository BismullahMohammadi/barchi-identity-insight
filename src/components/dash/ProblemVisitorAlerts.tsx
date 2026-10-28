import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { getProblemVisitors } from "@/lib/problem-visitors.functions";
import { recentReferralsQuery } from "@/lib/queries";
import { findPotentialProblemMatches } from "@/lib/problem-visitor-matching";

export function ProblemVisitorAlerts(){
 const visitors=useQuery({queryKey:["problem-visitors"],queryFn:()=>getProblemVisitors(),refetchInterval:60000,refetchIntervalInBackground:false,retry:false});
 const recent=useQuery(recentReferralsQuery(60000));
 if(visitors.error || recent.error || !visitors.data || !recent.data)return null;
 const matches=findPotentialProblemMatches(visitors.data,recent.data);
 if(!matches.length)return null;
 return <aside role="alert" aria-label="د مشکلاتي مراجعینو احتمالي تطابق" className="no-print mx-4 mt-3 rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-amber-950 sm:mx-6 md:mx-8">
  <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5"/>خبرتیا: {matches.length} احتمالي مشکلاتي مراجع ثبت شوی دی</div>
  <p className="mt-1 text-xs">دا د Google Sheets د وروستیو ثبتونو سره احتمالي تطابق دی، د مرکز ته د فزیکي راتګ قطعي تایید نه دی. د هویت تایید وکړئ.</p>
  <ul className="mt-2 space-y-1 text-sm">{matches.map(m=><li key={m.key}>{m.visitor.full_name} — د پلار نوم: {m.visitor.father_name} — {m.record.section==="intake"?"نوي معرفي شوي":"ثبت‌نام ته معرفي"} ({m.record.date??"نېټه نامعلومه"})</li>)}</ul>
 </aside>;
}
