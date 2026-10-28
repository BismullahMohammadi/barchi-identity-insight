import {useEffect} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import {AlertTriangle,CheckCircle2,MessageCircle,ShieldAlert} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getScheduledDailyCheck} from "@/lib/scheduled-check.functions";
import {buildMissingReportsWhatsapp,DEFAULT_WHATSAPP_TEMPLATE,WHATSAPP_TEMPLATE_KEY,validateWhatsappTemplate} from "@/lib/missing-reports-whatsapp";
import type {StaffCompleteness} from "@/lib/monthly-staff-completeness";

function currentTemplate():string{
 try{const stored=window.localStorage.getItem(WHATSAPP_TEMPLATE_KEY);
  return stored&&!validateWhatsappTemplate(stored)?stored:DEFAULT_WHATSAPP_TEMPLATE;
 }catch{return DEFAULT_WHATSAPP_TEMPLATE;}
}
export function ScheduledReportNotice(){
 const q=useQuery({queryKey:["scheduled-10am-report-check"],queryFn:()=>getScheduledDailyCheck(),
  staleTime:15_000,refetchInterval:60_000,refetchIntervalInBackground:false,retry:1});
 const report=q.data;
 useEffect(()=>{
  if(report?.status!=="incomplete"||typeof window==="undefined")return;
  const key="barchi-10am-alert-"+report.report_date;
  try{if(window.localStorage.getItem(key)==="seen")return;
    window.localStorage.setItem(key,"seen");}catch{/* browser storage unavailable */}
  toast.warning("د تېرې ورځې راپورونه نیمګړي دي",{
   description:"د "+report.missing_count+" کارمندانو راپورونه نه دي تایید شوي. WhatsApp ته د یادونې لېږلو اختیار شته.",
   duration:10_000,
  });
 },[report?.status,report?.report_date,report?.missing_count]);
 if(q.isError)return null; // Avoid misleading alerts when schedule read fails.
 if(!report||report.status==="nonwork")return null;
 const ready=report.status==="incomplete"&&report.registration&&report.insijam;
 const message=ready?buildMissingReportsWhatsapp(
  report.registration as StaffCompleteness,report.insijam as StaffCompleteness,
  currentTemplate()):null;
 const launch=()=>{
  if(!message)return;
  // Official WhatsApp share URL prefills text. User chooses group and taps Send.
  window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 };
 return <aside aria-label="د سهار لسو بجو د راپورونو ارزونه"
  className={"no-print mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 sm:mx-6 md:mx-8 "+
   (report.status==="incomplete"?"border-amber-500/35 bg-amber-500/10":"border-border bg-card")}>
  <div className="flex min-w-0 items-start gap-2">
   {report.status==="incomplete"?<AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>:
    report.status==="complete"?<CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/>:
    <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"/>}
   <div>
    <p className="text-sm font-bold">{report.status==="incomplete"?"د تېرې ورځې راپورونه نیمګړي دي":
     report.status==="complete"?"د پرون ټول راپورونه بشپړ دي":"د راپورونو اتومات ارزونه بشپړه نه شوه"}</p>
    <p className="text-xs text-muted-foreground">نېټه: {report.report_date} · د ۱۰ بجو اتومات ارزونه
     {report.status==="incomplete"?" · "+report.missing_count+" پاتې راپورونه":""}</p>
   </div>
  </div>
  {message&&<Button type="button" size="sm" onClick={launch}>
   <MessageCircle aria-hidden="true" className="me-2 h-4 w-4"/>WhatsApp ته انتقال
  </Button>}
 </aside>;
}
