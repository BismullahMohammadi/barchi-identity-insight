import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {UsersRound,UserRoundPlus,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {recentReferralsQuery,errorText} from "@/lib/queries";
import {useDashboardSettings,settingsRefreshMs} from "@/lib/dashboard-settings";
import type {ReferralGroup} from "@/lib/recent-referrals";

function People({group}:{group:ReferralGroup}){
 return <div>
  <p className="mb-3 text-xs text-muted-foreground">د راپور نېټه: {group.date??"نه ده موندل شوې"}</p>
  {!group.people.length?<p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">د معرفي شويو مراجعینو نومونه نشته.</p>:
  <ol className="space-y-2">
   {group.people.map((person,index)=><li key={index} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
     <p className="break-words text-sm font-bold text-foreground">{person.name}</p>
     <p className="mt-1 text-xs leading-5 text-muted-foreground">د پلار نوم: <span className="text-foreground">{person.father}</span></p>
     <p className="text-xs leading-5 text-muted-foreground">د کورنۍ غړي: <span className="font-semibold text-foreground">{person.familyMembers??"—"}</span></p>
    </li>)}
  </ol>}
 </div>;
}
/** Compact private people list: approximately the 256px desktop sidebar width. */
export function RecentReferralsCard(){
 const [section,setSection]=useState<"intake"|"registration">("intake");
 const settings=useDashboardSettings();
 const q=useQuery(recentReferralsQuery(settingsRefreshMs(settings)));
 return <section aria-label="وروستي معرفي شوي مراجعین" className="dashboard-panel w-full max-w-[320px] min-w-0 self-start overflow-hidden p-4 sm:p-4">
  <div className="mb-3 flex items-center justify-between gap-2">
   <h2 className="flex items-center gap-2 text-sm font-extrabold">
    <UsersRound aria-hidden="true" className="h-5 w-5 text-primary"/>وروستي مراجعین
   </h2>
   <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={()=>q.refetch()}
    disabled={q.isFetching} aria-label="د مراجعینو لېست تازه کړئ"><RefreshCw aria-hidden="true" className={"h-4 w-4 "+(q.isFetching?"animate-spin":"")}/></Button>
  </div>
  <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1" role="group" aria-label="د مراجعینو لېست">
   <button type="button" aria-pressed={section==="intake"} onClick={()=>setSection("intake")}
    className={"min-h-11 rounded-md px-1.5 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary "+(section==="intake"?"bg-card text-primary shadow-sm":"text-muted-foreground")}>نوي معرفي شوي</button>
   <button type="button" aria-pressed={section==="registration"} onClick={()=>setSection("registration")}
    className={"min-h-11 rounded-md px-1.5 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary "+(section==="registration"?"bg-card text-primary shadow-sm":"text-muted-foreground")}>ثبت‌نام ته معرفي</button>
  </div>
  {q.isLoading?<p role="status" className="py-8 text-center text-sm text-muted-foreground">معلومات رااخیستل کېږي…</p>:
    q.error?<p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{errorText(q.error)}</p>:
    q.data?<People group={section==="intake"?q.data.newReferrals:q.data.registration}/>:
    <p className="text-sm text-muted-foreground">معلومات نشته.</p>}
  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">تر پنځو وروستیو ثبتونو · یوازې د مدیر لپاره</p>
 </section>;
}
