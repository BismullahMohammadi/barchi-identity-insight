import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpLeft, ChartNoAxesColumn, CalendarDays, Files, ShieldCheck, Landmark, PackageCheck, Users } from "lucide-react";
import { DemoBadge, SyncBar } from "@/components/dash/SyncBar";
import { errorText, sheetQuery, dailyFormsQuery, dailyCoordinationQuery } from "@/lib/queries";
import { todayJalali, yesterdayJalali } from "@/lib/jalali";
import { OVERVIEW_SLUGS } from "@/lib/tabs";
import { type OverviewPeriod } from "@/lib/overview-period";
import { deriveOverviewFive } from "@/lib/overview-five";
import { WeeklyActivityChart } from "@/components/dash/WeeklyActivityChart";
import { recentReferralsQuery } from "@/lib/queries";
import type { ReferralGroup } from "@/lib/recent-referrals";
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
 {slug:"total",label:"نوي تذکرې (جدید)",value:null,change:null,icon:Files,tone:"blue",description:"یوازې پاس شوي"},
 {slug:"total",label:"عواید",value:null,change:null,icon:Landmark,tone:"amber",money:true,description:"د مجموعي راپور عواید"},
 {slug:"identity",label:"تثبیت هویت",value:null,change:null,icon:ShieldCheck,tone:"violet"},
 {slug:"distribution",label:"توزیع",value:null,change:null,icon:PackageCheck,tone:"emerald"},
];

function DailyVisitorList({group,loading,error}:{group?:ReferralGroup;loading:boolean;error:unknown}) {
 return <div className="mt-3 border-t border-border/70 pt-3">
  {loading?<p role="status" className="text-sm text-muted-foreground">معلومات رااخیستل کېږي…</p>:
   error?<p role="alert" className="text-sm text-destructive">{errorText(error)}</p>:
   !group?.people.length?<p className="text-sm text-muted-foreground">د وروستیو مراجعینو معلومات نشته.</p>:
   <><p className="mb-2 text-xs text-muted-foreground">د راپور نېټه: {group.date??"نه ده موندل شوې"}</p>
    <ol className="space-y-2">{group.people.slice(0,5).map((person,i)=><li key={i} className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm">
     <p className="font-bold">{person.name}</p>
     <p className="text-xs text-muted-foreground">د پلار نوم: {person.father}</p>
     <p className="text-xs text-muted-foreground">د کورنۍ غړي: {person.familyMembers??"—"}</p>
    </li>)}</ol></>}
 </div>;
}

function Overview() {
  const settings = useDashboardSettings();
  const [period, setPeriod] = useState<OverviewPeriod>("all");
  const [expandedVisitor, setExpandedVisitor] = useState<"intake"|"registration"|null>(null);
  const today = todayJalali();
  const yesterday = yesterdayJalali();
  const refreshMs = settingsRefreshMs(settings);
  const q = useQuery(sheetQuery(OVERVIEW_SLUGS, refreshMs));
  const daily = useQuery(dailyFormsQuery(refreshMs));
  const coordination = useQuery(dailyCoordinationQuery(refreshMs));
  const recent = useQuery({...recentReferralsQuery(refreshMs),enabled:settings.showDailyVisitors && expandedVisitor!==null});

  const overview = q.data ? deriveOverviewFive(q.data.tabs,period,today,yesterday) : null;
  const demo = !overview;
  const mainCards:SummaryMetric[] = overview ? [
    {...PLACEHOLDERS[0]!,...overview.individual},
    {...PLACEHOLDERS[1]!,...overview.newCards},
    {...PLACEHOLDERS[2]!,...overview.income},
    {...PLACEHOLDERS[3]!,...overview.identity},
    {...PLACEHOLDERS[4]!,...overview.distribution},
  ] : PLACEHOLDERS;
  const cardStyle = {
    teal: {root:"dashboard-kpi-teal",icon:"bg-teal-700/10 text-teal-800",number:"text-teal-900"},
    blue: {root:"dashboard-kpi-blue",icon:"bg-sky-700/10 text-sky-800",number:"text-sky-900"},
    amber: {root:"dashboard-kpi-amber",icon:"bg-amber-700/10 text-amber-800",number:"text-amber-900"},
    violet: {root:"dashboard-kpi-violet",icon:"bg-violet-700/10 text-violet-800",number:"text-violet-900"},
    emerald: {root:"dashboard-kpi-emerald",icon:"bg-emerald-700/10 text-emerald-800",number:"text-emerald-900"},
  } as const;
  const renderCard = (item: SummaryMetric, index:number) => {
    const colors = cardStyle[item.tone];
    return (
      <Link key={item.label} to="/dashboard/$slug" params={{slug:item.slug}}
        aria-label={item.label + (item.value===null?"؛ معلومات نشته":"؛ "+fmt(item.value))}
        className={"dashboard-kpi dashboard-kpi-polished group flex min-h-[172px] flex-col justify-between gap-4 focus-visible:ring-2 focus-visible:ring-primary "+colors.root+
          (settings.compactCards?" p-3 sm:p-4":" p-4 sm:p-5")+(index===0?" sm:col-span-2 xl:col-span-2":"")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-current/10 "+colors.icon}>
              <item.icon aria-hidden="true" className="h-5 w-5"/>
            </span>
            <h3 className="text-sm font-extrabold leading-6 text-foreground sm:text-base">{item.label}</h3>
          </div>
          <ArrowUpLeft aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground opacity-65 transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1"/>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className={"break-all text-3xl font-black tabular-nums tracking-tight sm:text-4xl "+colors.number}>
              {q.isLoading?"…":item.value===null?"—":fmt(item.value)}
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
    <div className="mx-auto max-w-7xl space-y-5 pb-8 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-hero p-5 text-primary-foreground shadow-card sm:p-6 md:p-7">
        <div className="absolute inset-0 pattern-dots" aria-hidden />
        <div className="relative">
          <p className="text-sm font-semibold text-amber-200">د دشت برچي د الکترونیکي تذکرو مرکز</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold md:text-3xl">د مرکز کاري بهیر</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">د فعالیتونو، عوایدو او کاري پرمختګ روښانه مدیریتي انځور.</p>
        </div>
      </section>

      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} refreshMs={refreshMs} />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2.5 shadow-card" role="group" aria-label="د راپور موده">
        <CalendarDays aria-hidden="true" className="mx-2 h-4 w-4 shrink-0 text-muted-foreground" />
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

      {demo && !q.isLoading && (
        <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          <DemoBadge /> لاندې شمېرې نمونه دي، اصلي معلومات نه دي. کله چې شیټ په خوندي ډول وصل شي، اصلي شمېرې ښکاري.
        </p>
      )}

      {settings.showDailyVisitors && (
        <section className="dashboard-panel p-4 sm:p-5" aria-label="ورځني مراجعین">
          <h2 className="mb-3 text-base font-bold">ورځني مراجعین</h2>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            {([
              {key:"intake" as const,title:"نوي معرفي شوي مراجعین",value:daily.isLoading?"…":daily.data?.ah2??"—",error:daily.error,group:recent.data?.newReferrals},
              {key:"registration" as const,title:"ثبت‌نام ته معرفي شوي مراجعین",value:coordination.isLoading?"…":coordination.data?.count??"—",error:coordination.error,group:recent.data?.registration},
            ]).map(item=><div key={item.key} className="min-w-0 rounded-lg bg-muted/50 px-4 py-3">
              <button type="button" className="flex w-full items-center justify-between gap-3 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={()=>setExpandedVisitor(current=>current===item.key?null:item.key)}
                aria-expanded={expandedVisitor===item.key} aria-controls={`daily-visitor-details-${item.key}`}>
                <span><span className="block text-sm text-muted-foreground">{item.title}</span>
                  <span className="mt-1 block text-2xl font-extrabold tabular-nums">{item.value}</span></span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                  {expandedVisitor===item.key?"پټول":"وروستي ۵ کتل"}
                  {expandedVisitor===item.key?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
                </span>
              </button>
              {item.error&&<p role="alert" className="mt-1 text-xs text-destructive">{errorText(item.error)}</p>}
              {expandedVisitor===item.key&&<div id={`daily-visitor-details-${item.key}`}>
                <DailyVisitorList group={item.group} loading={recent.isLoading} error={recent.error}/>
              </div>}
            </div>)}
          </div>
        </section>
      )}


      <div className="flex items-center gap-2 pt-1">
        <ChartNoAxesColumn aria-hidden="true" className="h-5 w-5 text-primary"/>
        <h2 className="text-lg font-extrabold">مهم مدیریتي شاخصونه</h2>
      </div>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
        {mainCards.map(renderCard)}
      </div>
      <WeeklyActivityChart />




    </div>
  );
}
