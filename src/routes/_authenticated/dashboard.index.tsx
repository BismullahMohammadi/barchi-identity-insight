import {getHistoricalReferrals} from "@/lib/sheets.functions";
import {formatJ} from "@/lib/jalali";
import {useGlobalDateRange} from "@/lib/global-date-range";
import { toLatinDigits } from "@/lib/jalali";
import { AnimatedNumber } from "@/components/dash/AnimatedNumber";
import "@/components/dash/dashboard-motion.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpLeft, ChartNoAxesColumn, RefreshCw, Files, ShieldCheck, Landmark, PackageCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accessQuery, errorText, sheetQuery, dailyFormsQuery, dailyCoordinationQuery } from "@/lib/queries";
import { todayJalali, yesterdayJalali } from "@/lib/jalali";
import { holidayOfToday } from "@/lib/holidays";
import { OVERVIEW_SLUGS } from "@/lib/tabs";
import { type OverviewPeriod } from "@/lib/overview-period";
import { deriveOverviewFive } from "@/lib/overview-five";
import { WeeklyActivityChart } from "@/components/dash/WeeklyActivityChart";
import { recentReferralsQuery } from "@/lib/queries";
import type { ReferralGroup, RegistrationDiagnostic, RecentReferral } from "@/lib/recent-referrals";
import { matchesRegisteredPerson } from "@/lib/registration-match";
import { ChevronDown, ChevronUp } from "lucide-react";

import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "د مرکز کاري بهیر — دشت برچي eNID ۱۴۰۵" },
      { name: "description", content: "د مرکز د ټولو برخو لنډیز." },
      { property: "og:title", content: "د مرکز کاري بهیر — دشت برچي eNID" },
      { property: "og:description", content: "د مرکز د ټولو برخو لنډیز." },
    ],
  }),
  component: Overview,
});

const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 0 });
type SummaryMetric = {slug:string;label:string;value:number|null;change:number|null;icon:typeof Files;tone:"teal"|"blue"|"amber"|"violet"|"emerald";money?:boolean;description?:string};
const PLACEHOLDERS:SummaryMetric[]=[
 {slug:"total",label:"عمومي راپور (انفرادي)",value:null,change:null,icon:Users,tone:"teal",description:"پاس شوي + مثنی + تجدید"},
 {slug:"services",label:"مثنی او تجدید",value:null,change:null,icon:Files,tone:"violet",description:"د خدماتو مجموعي ثبتونه"},
 {slug:"total",label:"نوي تذکرې (جدید)",value:null,change:null,icon:Files,tone:"blue",description:"یوازې پاس شوي"},
 {slug:"bank",label:"ټول عواید",value:null,change:null,icon:Landmark,tone:"amber",money:true,description:"د نوي ثبت او خدماتو عواید"},
 {slug:"identity",label:"تثبیت هویت",value:null,change:null,icon:ShieldCheck,tone:"violet"},
 {slug:"distribution",label:"توزیع",value:null,change:null,icon:PackageCheck,tone:"emerald"},
];

/** Registration-only: explain why no people are shown using safe metadata (dates, tab titles, counts). */
function RegistrationDiagnosticNote({d}:{d:RegistrationDiagnostic}) {
 const text={
  no_today_tab:`د نن ورځې (${d.today}) د هماهنګۍ پاڼه (tab) په شیټ کې نشته.`,
  empty_today:`د نن ورځې پاڼه «${d.todayTab??""}» شته، خو تر اوسه پکې مراجعین نه دي ثبت شوي.`,
  no_header:`د نن ورځې پاڼه «${d.todayTab??""}» شته، خو د «اسم / ولد / تعداد اعضای فامیل» سرلیک ونه موندل شو.`,
  fetch_error:"د هماهنګۍ شیټ لوستل ناکام شول؛ لږ وروسته بیا هڅه وکړئ.",
  ok:"",
 }[d.status];
 return <div role={d.status==="fetch_error"?"alert":"status"} className={"space-y-1 text-sm "+(d.status==="fetch_error"?"text-destructive":"text-muted-foreground")}>
  <p>{text}</p>
  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
   <li>د نن نېټه: {d.today}</li>
   {d.status==="no_today_tab"&&<li>وروستۍ موجوده پاڼه: {d.latestTab?`«${d.latestTab}» (${d.latestDate})`:"نشته"} — د پرونۍ ورځې معلومات د نن په توګه نه ښودل کېږي.</li>}
   {d.todayTab&&<li>سرچینه: «{d.todayTab}»{d.headerRow?` · سرلیک په {d.headerRow}م قطار · ${d.groups} ټیمونه · ${d.rowsScanned} قطارونه وکتل شول`:""}</li>}
   {d.sheetDateCell&&<li>په پاڼه کې لیکل شوې نېټه: {d.sheetDateCell}</li>}
   {d.errorCode&&<li>کوډ: {d.errorCode}</li>}
  </ul>
 </div>;
}

function DailyVisitorList({group,loading,error,firstSeenTimes,showFetchTime=false,registeredPeople=[],isRegistration=false}:{group?:ReferralGroup|undefined;loading:boolean;error:unknown;firstSeenTimes?:Record<string,string>|undefined;showFetchTime?:boolean;registeredPeople?:RecentReferral[];isRegistration?:boolean}) {
 const [showAll,setShowAll]=useState(false);
 return <div className="mt-3 border-t border-border/70 pt-3">
  {loading?<p role="status" className="text-sm text-muted-foreground">معلومات رااخیستل کېږي…</p>:
   error?<p role="alert" className="text-sm text-destructive">{errorText(error)}</p>:
   !group?.people.length?(group?.diagnostic?<RegistrationDiagnosticNote d={group.diagnostic}/>:<p className="text-sm text-muted-foreground">د وروستیو مراجعینو معلومات نشته.</p>):
   <><p className="mb-2 text-xs text-muted-foreground">د راپور نېټه: {group.date??"نه ده موندل شوې"}</p>
    <ol className="space-y-2">{group.people.slice(0,showAll?undefined:5).map((person,i)=><li key={i} className={"rounded-lg border px-3 py-2 text-sm "+(isRegistration?"border-border/60 bg-card/80":person.rejectionReason?"border-red-300/80 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30":(person.dailyApproved||person.birthCardConfirmed||registeredPeople.length&&matchesRegisteredPerson(person,registeredPeople))?"border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30":"border-border/60 bg-card/80")}>
     <div className="flex items-start justify-between gap-3"><p className="min-w-0 font-bold">{person.name}</p><div className="flex max-w-[55%] shrink-0 flex-col items-end gap-1 text-left">{showFetchTime&&person.recordKey&&firstSeenTimes?.[person.recordKey]&&<span className="text-xs text-muted-foreground">{firstSeenTimes[person.recordKey]}</span>}{person.rejectionReason&&<p className="rounded-md bg-red-100/70 px-2 py-1 text-xs leading-5 text-red-800 dark:bg-red-950/50 dark:text-red-200">{person.rejectionReason}</p>}{person.team&&<span className={person.team==="ثبت تولد"?"rounded-md border border-border/60 bg-muted px-2 py-1 text-xs font-medium text-foreground":"rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-bold text-primary"}>{person.team}</span>}</div></div>
     {isRegistration&&person.team==="ثبت تولد"&&person.fileCode&&<p className="text-xs text-muted-foreground">د دوسیې کوډ: {person.fileCode}</p>}
     <p className="text-xs text-muted-foreground">د پلار نوم: {person.father}</p>
     <p className="text-xs text-muted-foreground">د کورنۍ غړي: {person.familyMembers??"—"}</p>
    </li>)}</ol>
    <div className="mt-3 flex flex-col items-center gap-1">
      {!showAll && group.people.length > 5 ? (
        <Button type="button" size="sm" variant="outline" onClick={()=>setShowAll(true)}>نور وګورئ ({group.people.length-5} پاتې)</Button>
      ) : showAll && group.people.length > 5 ? (
        <Button type="button" size="sm" variant="ghost" onClick={()=>setShowAll(false)}>یوازې وروستي ۵ وښایئ</Button>
      ) : (
        <><Button type="button" size="sm" variant="outline" disabled>نور وګورئ</Button><p className="text-xs text-muted-foreground">نور مراجعین نشته.</p></>
      )}
    </div></>}
 </div>;
}

function Overview() {
  const {range}=useGlobalDateRange();
  const settings = useDashboardSettings();
  const [period, setPeriod] = useState<OverviewPeriod>("all");
  const [expandedVisitors, setExpandedVisitors] = useState<Record<"intake"|"registration",boolean>>({intake:false,registration:false});
  const today = todayJalali();
  
  const yesterday = yesterdayJalali();
  const refreshMs = settingsRefreshMs(settings);
  const access=useQuery(accessQuery);
  const canView=(slug:string)=>access.data?.owner===true || access.data?.permissions?.[slug]?.includes("view")===true;
  const allowedSlugs=OVERVIEW_SLUGS.filter(canView);
  const q = useQuery({...sheetQuery(allowedSlugs, refreshMs),enabled:access.isSuccess && allowedSlugs.length>0});
  const daily = useQuery({...dailyFormsQuery(refreshMs),enabled:canView("dashboard")});
  const coordination = useQuery({...dailyCoordinationQuery(refreshMs),enabled:canView("dashboard")});
  const recent = useQuery({...recentReferralsQuery(refreshMs),enabled:canView("dashboard")&&settings.showDailyVisitors});
  const historicalSupported=!!range&&(range.to.y-range.from.y)*12+range.to.m-range.from.m<=2;
  const historical=useQuery({queryKey:["historical-referrals",range?.from,range?.to],queryFn:()=>getHistoricalReferrals({data:{from:formatJ(range!.from),to:formatJ(range!.to)}}),enabled:canView("dashboard")&&historicalSupported&&settings.showDailyVisitors,staleTime:60000,retry:1});
  const recentData=range?(historicalSupported?historical.data:undefined):recent.data;
  const recentLoading=range?historical.isLoading:recent.isLoading;
  const recentError=range?(historicalSupported?historical.error:new Error("له درېیو میاشتو اوږده تاریخي موده نه ده ملاتړ شوې")):recent.error;
  const [firstSeenTimes,setFirstSeenTimes]=useState<Record<string,string>>({});
  useEffect(()=>{
    const people=recentData?.newReferrals.people;
    if(!people?.length)return;
    // Keep first observation per stable Sheet record, not each refresh timestamp.
    try {
      const storageKey="barchi-intake-first-seen-v1";
      const stored=JSON.parse(window.localStorage.getItem(storageKey)??"{}") as Record<string,string>;
      const next={...stored};
      let changed=false;
      const time=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
      for(const person of people){
        if(person.recordKey&&!next[person.recordKey]){next[person.recordKey]=time;changed=true;}
      }
      if(changed)window.localStorage.setItem(storageKey,JSON.stringify(next));
      setFirstSeenTimes(next);
    }catch { /* Private browser storage may be disabled. */ }
  },[recentData?.newReferrals]);


  const overview = q.data ? deriveOverviewFive(q.data.tabs,period,today,yesterday,range) : null;
  const unavailable = !overview;
  const mainCards:SummaryMetric[] = overview ? [
    {...PLACEHOLDERS[0]!,...overview.individual},
    {...PLACEHOLDERS[1]!,...overview.duplicateRenewal},
    {...PLACEHOLDERS[2]!,...overview.newCards},
    {...PLACEHOLDERS[3]!,...overview.income},
    {...PLACEHOLDERS[4]!,...overview.identity},
    {...PLACEHOLDERS[5]!,...overview.distribution},
  ] : PLACEHOLDERS;
  const cardStyle = {
    teal: {root:"dashboard-kpi-teal",icon:"bg-teal-700/10 text-teal-800",number:"text-teal-900"},
    blue: {root:"dashboard-kpi-blue",icon:"bg-sky-700/10 text-sky-800",number:"text-sky-900"},
    amber: {root:"dashboard-kpi-amber",icon:"bg-amber-700/10 text-amber-800",number:"text-amber-900"},
    violet: {root:"dashboard-kpi-violet",icon:"bg-violet-700/10 text-violet-800",number:"text-violet-900"},
    emerald: {root:"dashboard-kpi-emerald",icon:"bg-emerald-700/10 text-emerald-800",number:"text-emerald-900"},
  } as const;
  const renderCard = (item: SummaryMetric) => {
    if(!canView(item.slug))return null;
    const colors = cardStyle[item.tone];
    return (
      <Link key={item.label} to="/dashboard/$slug" params={{slug:item.slug}}
        aria-label={item.label + (item.value===null?"؛ معلومات نشته":"؛ "+fmt(item.value))}
        className={"dashboard-kpi dashboard-kpi-polished barchi-card-motion barchi-enter group flex min-h-[128px] flex-col justify-between gap-2 focus-visible:ring-2 focus-visible:ring-primary "+colors.root+
          (settings.compactCards?" p-3 sm:p-4":" p-4 sm:p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-current/10 "+colors.icon}>
              <item.icon aria-hidden="true" className="h-5 w-5"/>
            </span>
            <h3 className="text-sm font-extrabold leading-6 text-foreground sm:text-base">{item.label}</h3>
          </div>
          <ArrowUpLeft aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground opacity-65 transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1"/>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className={"break-all text-2xl font-black tabular-nums tracking-tight sm:text-3xl "+colors.number}>
              {q.isLoading?"…":item.value===null?"—":<AnimatedNumber value={item.value}/>}
            </p>
            {item.money&&item.value!==null&&<span className="text-xs font-bold text-muted-foreground">AFN</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.description&&<p className="text-xs leading-5 text-muted-foreground">{item.description}</p>}
            {item.change!==null&&<p className="rounded-md bg-card/70 px-2 py-1 text-xs font-semibold text-foreground">
              د تېرې ورځې په پرتله: {item.change>0?"+":""}{item.change}%
            </p>}
            {!q.isLoading&&item.value===null&&<span className="text-xs text-muted-foreground">د ټاکلې مودې معلومات نشته</span>}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-3 pb-6 sm:space-y-4">
      {holidayOfToday(today)&&<p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold">{holidayOfToday(today)}</p>}
      {q.error&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorText(q.error)}</p>}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2 shadow-card">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1" role="group" aria-label="د راپور موده">
        {([
          ["all", "ټول کال"],
          ["month", "روانه میاشت"],
          ["previousMonth", "تېره میاشت"],
          ["today", "نن"],
          ["yesterday", "تېره ورځ"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className="dashboard-period-button">
            {label}
          </button>
        ))}
        </div>
        <Button variant="outline" size="sm" className="ms-auto shrink-0 rounded-full" onClick={()=>void q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={"h-4 w-4 "+(q.isFetching?"animate-spin":"")}/>{q.isFetching?"ریفریش کېږي…":"ریفریش"}
        </Button>
      </div>

      {unavailable && !q.isLoading && (
        <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          اصلي معلومات لا نه دي ترلاسه شوي. د اړیکې حالت وګورئ او د تازه کولو تڼۍ وکاروئ.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <ChartNoAxesColumn aria-hidden="true" className="h-5 w-5 text-primary"/>
        <h2 className="text-lg font-extrabold">مهم مدیریتي شاخصونه</h2>
      </div>
      <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {mainCards.map(renderCard)}
      </div>

      {range&&!historicalSupported&&<p role="status" className="rounded-lg border bg-muted/30 p-3 text-sm">د مراجعینو د تفصیلي لېست لپاره درې میاشتې یا تر دې کمه موده وټاکئ.</p>}
      {range&&historicalSupported&&<p role="status" className="rounded-lg border p-3 text-xs text-muted-foreground">د ټاکلې مودې د مراجعینو شمېرې د ثبت او جمع‌آورۍ له شیټونو څخه دي؛ د تایید او رد تاریخي حالتونه لا په دې مودې کې نه دي محاسبه شوي.</p>}
      {settings.showDailyVisitors && (!range||historicalSupported) && (
        <section className="dashboard-panel p-4 sm:p-5" aria-label="ورځني مراجعین">
          <h2 className="mb-3 text-base font-bold">ورځني مراجعین</h2>
          <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2" aria-label="ټیمونو ته د ورځې معرفي شوي مراجعین">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold">ټیمونو ته د ورځې معرفي شوي د فامیل غړي</p><span className="text-[11px] text-muted-foreground">{recentData?.registration.date??"د وروستۍ ورځې راپور"}</span></div>
            {recentLoading?<p className="text-xs text-muted-foreground">رااخیستل کېږي…</p>:recentError?<p className="text-xs text-destructive">د ټیمونو شمېرې ونه لوستل شوې.</p>:recentData?.registration.date?
            <div className="grid grid-cols-4 gap-1.5">
             {(["درېیم","څلورم","پنځم","شپږم"] as const).map((label,i)=><div key={label} className="rounded-md bg-background px-1.5 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">{label}</p><p className="text-lg font-black tabular-nums">{recentData?.teamCounts?.[i]??"—"}</p>
             </div>)}
            </div>:<p className="text-xs text-muted-foreground">د نن ورځې د ټیمونو راپور نشته.</p>}
          </div>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            {([
              {key:"intake" as const,title:"نوي معرفي شوي مراجعین",value:range?(recentLoading?"…":recentData?.newReferrals.people.reduce((n,p)=>n+(p.familyMembers??0),0)??"—"):daily.isLoading?"…":daily.data?.ah2??"—",error:daily.error,group:recentData?.newReferrals,source:daily.data?.tabName&&daily.data?.cell?daily.data.tabName+" · "+daily.data.cell:null},
              {key:"registration" as const,title:"ثبت‌نام ته معرفي شوي مراجعین",value:range?(recentLoading?"…":recentData?.registration.people.reduce((n,p)=>n+(p.familyMembers??0),0)??"—"):coordination.isLoading?"…":coordination.data?.count!=null?Number(toLatinDigits(coordination.data.count).replace(/[٬, ]/g,""))+(recentData?.birthCardAddedCount??0):(recentData?.birthCardAddedCount?recentData.birthCardAddedCount:"—"),error:coordination.error,group:recentData?.registration,source:coordination.data?.tabName&&coordination.data?.cell?coordination.data.tabName+" · "+coordination.data.cell:null},
            ]).map(item=><div key={item.key} className="min-w-0 rounded-lg bg-muted/50 px-4 py-3">
              <button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={()=>setExpandedVisitors(current=>{const nextOpen=!current[item.key];return window.matchMedia("(min-width: 1024px)").matches?{...current,[item.key]:nextOpen}:{intake:item.key==="intake"&&nextOpen,registration:item.key==="registration"&&nextOpen};})}
                aria-expanded={expandedVisitors[item.key]} aria-controls={`daily-visitor-details-${item.key}`}>
                <span><span className="block text-sm text-muted-foreground">{item.title}</span>
                  <span className="mt-1 block text-2xl font-extrabold tabular-nums">{item.value}</span></span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                  {expandedVisitors[item.key]?"پټول":"وروستي ۵ کتل"}
                  {expandedVisitors[item.key]?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
                </span>
              </button>
              {item.error&&<p role="alert" className="mt-1 text-xs text-destructive">{errorText(item.error)}</p>}
              {!range&&!recentLoading&&!recentError&&item.group?.people.length?(
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.key==="intake"?(()=>{
                    const people=item.group.people;
                    if("requestedDate" in item.group && item.group.requestedDate && item.group.date!==item.group.requestedDate) return `د نن ورځې (${item.group.requestedDate}) د جمع‌آورۍ معلومات نشته؛ د ${item.group.date??"نامعلومې ورځې"} شمېرې د نن ورځې په توګه نه حسابېږي.`;
                    const registered=recentData?.registration.people??[];
                    // Status counts represent referred files/clients, not their family-member totals.
                    // One family can have many members but must only count as one referral.
                    const rejected=people.filter(p=>!!p.rejectionReason);
                    const approved=people.filter(p=>!p.rejectionReason&&(p.dailyApproved||p.birthCardConfirmed||matchesRegisteredPerson(p,registered)));
                    const pending=people.filter(p=>!p.rejectionReason&&!p.dailyApproved&&!p.birthCardConfirmed&&!matchesRegisteredPerson(p,registered));
                    return `رد شوي: ${rejected.length} · تایید شوي: ${approved.length} · منتظر: ${pending.length}`;
                  })():(()=>{
                    const people=item.group.people;
                    const sumMembers=(members:typeof people)=>members.reduce((total,p)=>total+(p.familyMembers??0),0);
                    const births=people.filter(p=>p.team==="ثبت تولد");
                    const ordinary=people.filter(p=>p.team!=="ثبت تولد");
                    return `ثبت تولد: ${sumMembers(births)} · عادي: ${sumMembers(ordinary)}`;
                  })()}
                  <span className="ms-1 opacity-70">{item.key==="intake"?"(د معرفي شوو انفرادي ثبتونو شمېر)":"(د فامیل غړي، په لېست کې)"}</span>
                </p>
              ):null}
              {expandedVisitors[item.key]&&<div id={`daily-visitor-details-${item.key}`}>
                <DailyVisitorList group={item.group} loading={recentLoading} error={recentError} firstSeenTimes={firstSeenTimes} showFetchTime={item.key==="intake"} isRegistration={item.key==="registration"} registeredPeople={item.key==="intake"?recentData?.registration.people??[]:[]}/>
              </div>}
            </div>)}
          </div>
        </section>
      )}


      <WeeklyActivityChart />




    </div>
  );
}

