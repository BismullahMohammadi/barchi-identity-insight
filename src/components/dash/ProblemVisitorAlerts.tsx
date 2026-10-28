import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { recentReferralsQuery } from "@/lib/queries";

/** Server only compares full daily records; browser receives matched identities, not raw rosters. */
export function ProblemVisitorAlerts() {
 const recent=useQuery(recentReferralsQuery(60000));
 const matches=recent.data?.potentialMatches??[];
 if(recent.error||!matches.length)return null;
 return <aside role="alert" aria-label="د مشکلاتي مراجعینو احتمالي تطابق"
   className="no-print mx-4 mt-3 rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-amber-950 sm:mx-6 md:mx-8">
  <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5"/>خبرتیا: {matches.length} احتمالي مشکلاتي مراجع د ثبت په معلوماتو کې وموندل شو</div>
  <p className="mt-1 text-xs">د اضافي فاصلو، د تورو د بڼې او کوچنیو املايي توپیرونو له پامه غورځولو سره احتمالي مشابهت ښودل کېږي. دا قطعي هویت نه دی؛ د مراجع اصلي اسناد تایید کړئ.</p>
  <ul className="mt-2 space-y-1 text-sm">{matches.map(m=><li key={m.key}>
   {m.fullName} — د پلار نوم: {m.fatherName} — {m.section==="intake"?"نوي معرفي شوي":"ثبت‌نام ته معرفي"} ({m.date??"نېټه نامعلومه"})
  </li>)}</ul>
 </aside>;
}
