import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChartNoAxesColumn, CalendarDays, ClipboardCheck, Files, ShieldCheck, Landmark, PackageCheck, Users } from "lucide-react";
import { DemoBadge, SyncBar } from "@/components/dash/SyncBar";
import { errorText, sheetQuery, dailyFormsQuery, dailyCoordinationQuery } from "@/lib/queries";
import { todayJalali, yesterdayJalali } from "@/lib/jalali";
import { OVERVIEW_SLUGS } from "@/lib/tabs";
import { type OverviewPeriod } from "@/lib/overview-period";
import { deriveOverviewFive, sourceMetric } from "@/lib/overview-five";

import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "عمومي کتنه — دشت برچي eNID ۱۴۰۵" },
      { name: "description", content: "د مرکز د ټولو برخو لنډیز." },
      { property: "og:title", content: "عمومي کتنه — دشت برچي eNID" },
      { property: "og:description", content: "د مرکز د ټولو برخو لنډیز." },
    ],
  }),
  component: Overview,
});

const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 0 });
type SummaryMetric = {slug:string;label:string;value:number|null;change:number|null;icon:typeof Files;tone:string;money?:boolean;description?:string};
const PLACEHOLDERS:SummaryMetric[]=[
 {slug:"total",label:"عمومي راپور (انفرادي)",value:null,change:null,icon:Users,tone:"text-primary",description:"پاس شوي + مثنی + تجدید"},
 {slug:"total",label:"نوي تذکرې (جدید)",value:null,change:null,icon:Files,tone:"text-primary",description:"یوازې پاس شوي"},
 {slug:"total",label:"عواید",value:null,change:null,icon:Landmark,tone:"text-amber-700",money:true,description:"د مجموعي راپور عواید"},
 {slug:"identity",label:"تثبیت هویت",value:null,change:null,icon:ShieldCheck,tone:"text-primary"},
 {slug:"distribution",label:"توزیع",value:null,change:null,icon:PackageCheck,tone:"text-sky-700"},
];

function Overview() {
  const settings = useDashboardSettings();
  const [period, setPeriod] = useState<OverviewPeriod>("all");
  const today = todayJalali();
  const yesterday = yesterdayJalali();
  const refreshMs = settingsRefreshMs(settings);
  const q = useQuery(sheetQuery(OVERVIEW_SLUGS, refreshMs));
  const daily = useQuery(dailyFormsQuery(refreshMs));
  const coordination = useQuery(dailyCoordinationQuery(refreshMs));

  const overview = q.data ? deriveOverviewFive(q.data.tabs,period,today,yesterday) : null;
  const demo = !overview;
  const mainCards:SummaryMetric[] = overview ? [
    {...PLACEHOLDERS[0]!,...overview.individual},
    {...PLACEHOLDERS[1]!,...overview.newCards},
    {...PLACEHOLDERS[2]!,...overview.income},
    {...PLACEHOLDERS[3]!,...overview.identity},
    {...PLACEHOLDERS[4]!,...overview.distribution},
  ] : PLACEHOLDERS;
  const quality = q.data ? sourceMetric(q.data.tabs,"control",6,period,today,yesterday) : null;
  const renderCard=(item:SummaryMetric)=>(
    <Link key={item.label} to="/dashboard/$slug" params={{slug:item.slug}} className={settings.compactCards?"dashboard-kpi group p-3":"dashboard-kpi group"}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <item.icon aria-hidden="true" className={"h-4 w-4 "+item.tone}/>{item.label}
        </span>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={"mt-3 text-2xl font-extrabold tabular-nums sm:text-3xl "+item.tone}>{q.isLoading?"…":item.value===null?"—":fmt(item.value)}{item.money&&item.value!==null&&<span className="ms-1 text-xs font-medium text-muted-foreground">AFN</span>}</p>
      {item.description&&<p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
      {item.change!==null&&<p className="mt-1 text-xs text-muted-foreground">د پرون پرتله: <strong>{item.change>0?"+":""}{item.change}%</strong></p>}
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-hero p-5 text-primary-foreground shadow-card sm:p-6 md:p-7">
        <div className="absolute inset-0 pattern-dots" aria-hidden />
        <div className="relative">
          <p className="text-sm font-semibold text-amber-200">د دشت برچي د الکترونیکي تذکرو مرکز</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold md:text-3xl">د مرکز عمومي کتنه</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">د فعالیتونو او عوایدو مهم شاخصونه، د هجري شمسي مودې له مخې.</p>
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

      <div className="flex items-center gap-2 pt-1">
        <ChartNoAxesColumn aria-hidden="true" className="h-5 w-5 text-primary"/>
        <h2 className="text-lg font-extrabold">مهم مدیریتي شاخصونه</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {mainCards.map(renderCard)}
      </div>
      <section className="dashboard-panel p-4 sm:p-5" aria-label="د کیفیت کنټرول پاس دوسیې">
        <Link to="/dashboard/$slug" params={{slug:"control"}} className="group flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold"><ClipboardCheck aria-hidden="true" className="h-5 w-5 text-primary"/>د کیفیت کنټرول پاس دوسیې</h2>
            <p className="mt-1 text-xs text-muted-foreground">د کنټرول د شیټ جلا مجموعه، د ټاکلې مودې مطابق</p>
          </div>
          <strong className="shrink-0 text-2xl font-extrabold tabular-nums text-primary">{q.isLoading?"…":quality?.value===null||!quality?"—":fmt(quality.value)}</strong>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground"/>
        </Link>
      </section>

      {settings.showDailyVisitors && (
        <section className="dashboard-panel p-4 sm:p-5" aria-label="ورځني مراجعین">
          <h2 className="mb-3 text-base font-bold">ورځني مراجعین</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">نوي معرفي شوي مراجعین</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{daily.isLoading ? "…" : daily.data?.ah2 ?? "—"}</p>
              {daily.error && <p role="alert" className="mt-1 text-xs text-destructive">{errorText(daily.error)}</p>}
            </div>
            <div className="min-w-0 rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">ثبت نام ته معرفي شوي مراجعین</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{coordination.isLoading ? "…" : coordination.data?.count ?? "—"}</p>
              {coordination.error && <p role="alert" className="mt-1 text-xs text-destructive">{errorText(coordination.error)}</p>}
            </div>
          </div>
        </section>
      )}


    </div>
  );
}
