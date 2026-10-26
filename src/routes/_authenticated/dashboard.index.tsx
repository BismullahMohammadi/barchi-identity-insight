import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ChartNoAxesColumn, CalendarDays, ClipboardCheck, Files, RotateCcw, ShieldCheck, Landmark, PackageCheck } from "lucide-react";
import { DemoBadge, SyncBar } from "@/components/dash/SyncBar";
import { errorText, sheetQuery, dailyFormsQuery, dailyCoordinationQuery } from "@/lib/queries";
import { todayJalali, yesterdayJalali } from "@/lib/jalali";
import { normalizeGrid, sumColumn } from "@/lib/normalize";
import { OVERVIEW_SLUGS } from "@/lib/tabs";
import { periodRows, previousDayChange, type OverviewPeriod } from "@/lib/overview-period";

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
type SummaryMetric={slug:string;label:string;value:number|null;change:number|null;icon:typeof Files;tone:string};
const INITIAL:SummaryMetric[]=[
 {slug:"total",label:"پاس شوي",value:null,change:null,icon:Files,tone:"text-primary"},
 {slug:"services",label:"مثنی",value:null,change:null,icon:RotateCcw,tone:"text-sky-700"},
 {slug:"services",label:"تجدید",value:null,change:null,icon:ShieldCheck,tone:"text-amber-700"},
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

  const summary = useMemo(()=>{
    if(!q.data)return null;
    const get=(slug:string,col:number):{value:number|null;change:number|null}=>{
      const source=q.data.tabs.find(t=>t.slug===slug);
      if(!source)return {value:null,change:null};
      try{
        const table=normalizeGrid(source.grid,source.title);
        const rows=periodRows(table,period,today,yesterday);
        if(!table.numericCols.includes(col)||rows.length===0||!rows.some(row=>typeof row[col]==="number"))return {value:null,change:null};
        const value=sumColumn(rows,col);
        const change=period==="today"?previousDayChange(table,col,today,yesterday):null;
        return {value,change};
      }catch{return {value:null,change:null};}
    };
    return {
      main:[
        {...INITIAL[0]!,...get("total",3)},
        {...INITIAL[1]!,...get("services",1)},
        {...INITIAL[2]!,...get("services",2)},
      ],
      quality:get("control",6),
      secondary:[
       {slug:"identity",label:"تثبیت هویت",icon:ShieldCheck,tone:"text-primary",...get("identity",10)},
       {slug:"bank",label:"بانکي عواید",icon:Landmark,tone:"text-amber-700",...get("bank",6)},
       {slug:"distribution",label:"توزیع",icon:PackageCheck,tone:"text-sky-700",...get("distribution",3)},
      ] as SummaryMetric[],
    };
  },[q.data,period,today.y,today.m,today.d,yesterday.y,yesterday.m,yesterday.d]);
  const demo=!summary;
  const mainCards=summary?.main??INITIAL;
  const secondary=summary?.secondary??[
    {slug:"identity",label:"تثبیت هویت",icon:ShieldCheck,tone:"text-primary",value:null,change:null},
    {slug:"bank",label:"بانکي عواید",icon:Landmark,tone:"text-amber-700",value:null,change:null},
    {slug:"distribution",label:"توزیع",icon:PackageCheck,tone:"text-sky-700",value:null,change:null},
  ];
  const renderCard=(item:SummaryMetric)=>(
    <Link key={item.label} to="/dashboard/$slug" params={{slug:item.slug}} className={settings.compactCards?"dashboard-kpi group p-3":"dashboard-kpi group"}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <item.icon aria-hidden="true" className={"h-4 w-4 "+item.tone}/>{item.label}
        </span>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={"mt-3 text-2xl font-extrabold tabular-nums sm:text-3xl "+item.tone}>{q.isLoading?"…":item.value===null?"—":fmt(item.value)}{item.slug==="bank"&&item.value!==null&&<span className="ms-1 text-xs font-medium text-muted-foreground">AFN</span>}</p>
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
        <h2 className="text-lg font-extrabold">مجموعي فعالیت</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {mainCards.map(renderCard)}
      </div>
      <section className="dashboard-panel p-4 sm:p-5" aria-label="د کیفیت کنټرول پاس دوسیې">
        <Link to="/dashboard/$slug" params={{slug:"control"}} className="group flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold"><ClipboardCheck aria-hidden="true" className="h-5 w-5 text-primary"/>د کیفیت کنټرول پاس دوسیې</h2>
            <p className="mt-1 text-xs text-muted-foreground">د ټاکلې مودې د کنټرول شیټ ثبت شوې مجموعه؛ چاپ ته لېږل شوې دوسیې</p>
          </div>
          <strong className="shrink-0 text-2xl font-extrabold tabular-nums text-primary">{q.isLoading?"…":summary?.quality.value===null||!summary?"—":fmt(summary.quality.value)}</strong>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground"/>
        </Link>
      </section>
      <h2 className="pt-1 text-base font-extrabold">نور مهم شاخصونه</h2>
      <div className="grid gap-3 sm:grid-cols-3">{secondary.map(renderCard)}</div>

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
