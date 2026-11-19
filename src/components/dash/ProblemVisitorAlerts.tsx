import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { recentReferralsQuery } from "@/lib/queries";

/** Server only compares full daily records; browser receives matched identities, not raw rosters. */
export function ProblemVisitorAlerts() {
 const recent=useQuery(recentReferralsQuery(60000));
 const matches=recent.data?.potentialMatches??[];
 if(recent.error||!matches.length)return null;
 return <aside role="alert" aria-label="له ثبت شوو نومونو سره احتمالي سمون"
   className="rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-amber-950">
  <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5"/>له ثبت شوو نومونو سره احتمالي سمون ({matches.length})</div>
  <p className="mt-1 text-xs">نومونه سره ورته دي. د مراجع هویت له اصلي اسنادو سره تایید کړئ.</p>
  <ul className="mt-2 space-y-1 text-sm">{matches.map(m=><li key={m.key}>
   {m.fullName} — د پلار نوم: {m.fatherName} — {m.section==="intake"?"نوي معرفي شوي":"ثبت‌نام ته معرفي"} ({m.date??"نېټه نامعلومه"})
  </li>)}</ul>
 </aside>;
}
