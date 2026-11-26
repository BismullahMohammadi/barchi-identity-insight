import { DashboardAccessContext } from "@/lib/dashboard-access-context";
import {GlobalDateProvider} from "@/lib/global-date-range";
import {GlobalJalaliPicker} from "@/components/dash/GlobalJalaliPicker";
import { createFileRoute, Link, Navigate, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Fuel, AlertTriangle, LogOut, Menu, ShieldAlert, Settings, PanelRightOpen, ContactRound, ClipboardCheck, Landmark, Blocks, PackageCheck, Truck, CalendarRange, Files, ScanLine, PanelRightClose, PanelRightOpen as SidebarOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, DASHBOARD_SECTIONS, sectionForPage } from "@/lib/dashboard-access";
import { accessQuery, recentReferralsQuery } from "@/lib/queries";
import { TABS, sectionLabels } from "@/lib/tabs";
import { PinnedWidgets } from "@/components/dash/PinnedWidgets";
import { ScheduledReportNotice } from "@/components/dash/ScheduledReportNotice";
import { NewProblemVisitorNotice } from "@/components/dash/NewProblemVisitorNotice";
import { ProblemNotificationBell } from "@/components/dash/ProblemNotificationBell";
import { useDashboardSettings } from "@/lib/dashboard-settings";
import { useStaffCompletionMonitor } from "@/lib/staff-completion-alerts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "ډشبورډ — دشت برچي eNID ۱۴۰۵" },
      { name: "description", content: "د دشت برچي eNID مرکز خصوصي تحلیلي ډشبورډ." },
      { property: "og:title", content: "ډشبورډ — دشت برچي eNID" },
      { property: "og:description", content: "خصوصي تحلیلي ډشبورډ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardLayout,
});

export function Nav({ onNavigate,matchCount=0,owner=false,permissions={} }: { onNavigate?: () => void; matchCount?:number; owner?:boolean; permissions?:Record<string,string[]> }) {
  const canView=(section:string)=>canAccess({owner,permissions},section);
  const icons: Record<string, typeof Files> = {total:Files,identity:ContactRound,control:ClipboardCheck,services:Blocks,distribution:PackageCheck,arrivals:Truck,"archive-scan":ScanLine,bank:Landmark,annual:CalendarRange};
  const cls = "group flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none hover:bg-sidebar-accent hover:translate-x-[-2px] focus-visible:ring-2 focus-visible:ring-sidebar-primary";
  const active = { className: `${cls} border-sidebar-primary/25 border-s-[3px] border-s-sidebar-primary bg-sidebar-accent text-sidebar-foreground font-extrabold shadow-sm` };
  const groups = [
    { title: "اصلي عملیاتي راپورونه", slugs: ["total", "identity", "control", "services", "distribution", "bank"] },
    { title: "نور راپورونه", slugs: ["arrivals", "archive-scan", "annual"] },
  ];
  return (
    <nav aria-label="د ډشبورډ مینو" className="flex min-h-0 flex-col gap-4">
      {canView("dashboard") && <Link to="/dashboard" activeOptions={{ exact: true }} className={cls} activeProps={active} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4 shrink-0" /> {sectionLabels["dashboard"]}
      </Link>}
      {canView("problem-visitors") && <Link to="/dashboard/$slug" params={{ slug: "problem-visitors" }} className={cls} activeProps={active} onClick={onNavigate}>
        <AlertTriangle className="h-4 w-4 shrink-0" /> <span className="min-w-0 flex-1">{sectionLabels["problem-visitors"]}</span>{matchCount>0&&<span aria-label={`د احتمالي تطابق شمېر ${matchCount}`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-extrabold text-amber-950 dark:bg-amber-800 dark:text-white">{matchCount>99?"99+":matchCount}</span>}
      </Link>}
      {groups.filter(group => group.slugs.some(canView)).map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-sidebar-foreground/60">{group.title}</p>
          {group.slugs.map((slug) => {
            const tab = TABS.find((item) => item.slug === slug);
            if (!tab || !canView(slug)) return null;
            return (
              <Link key={slug} to="/dashboard/$slug" params={{ slug }}
                className={cls} activeProps={active} onClick={onNavigate}>
                {(() => { const Icon = icons[slug] ?? Files; return <Icon aria-hidden="true" className="h-4 w-4 shrink-0 opacity-80" />; })()}
                <span className="min-w-0 truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      {(owner || ["reconciliation","center-quality","fuel-management"].some(canView)) && <div className="space-y-1 border-t border-sidebar-border pt-3">
        <p className="px-3 pb-1 text-xs font-semibold text-sidebar-foreground/60">اداري او مرستندویه برخې</p>
        {owner && <Link to="/dashboard/$slug" params={{ slug: "admin-users" }} className={cls} activeProps={active} onClick={onNavigate}><ShieldAlert className="h-4 w-4 shrink-0" /> {sectionLabels["admin-users"]}</Link>}
        {canView("reconciliation") && <Link to="/dashboard/reconciliation" className={cls} activeProps={active} onClick={onNavigate}><ClipboardCheck className="h-4 w-4 shrink-0" /> {sectionLabels["reconciliation"]}</Link>}
        {canView("center-quality") && <Link to="/dashboard/center-quality" className={cls} activeProps={active} onClick={onNavigate}><ClipboardCheck className="h-4 w-4 shrink-0" /> {sectionLabels["center-quality"]}</Link>}
        {canView("fuel-management") && <Link to="/dashboard/$slug" params={{ slug: "fuel-management" }} className={cls} activeProps={active} onClick={onNavigate}><Fuel className="h-4 w-4 shrink-0" /> {sectionLabels["fuel-management"]}</Link>}
      </div>}
    </nav>
  );
}
function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const cls = "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-primary";
  return (
    <Link to="/dashboard/$slug" params={{ slug: "settings" }} className={cls}
      activeProps={{ className: `${cls} bg-sidebar-accent text-sidebar-primary font-bold` }}
      onClick={onNavigate}>
      <Settings className="h-4 w-4 shrink-0" /> {sectionLabels["settings"]}
    </Link>
  );
}

function DashboardLayout(){return <GlobalDateProvider><DashboardLayoutContent/></GlobalDateProvider>;}
function DashboardLayoutContent() {
  // Watch completion while authenticated even if the tools drawer is closed.
  const pathname = useLocation({ select: (location) => location.pathname });
  const currentSlug = pathname.split("/").filter(Boolean).at(-1);
  const pageTitle = sectionLabels[currentSlug ?? "dashboard"] ?? "د مرکز راپورونه";
  const access = useQuery(accessQuery);
  const profile = access.isError ? undefined : access.data;
  const canDashboard = canAccess(profile, "dashboard");
  const canViewArrivals = canAccess(profile, "arrivals");
  const canMatch = canDashboard && canAccess(profile, "problem-visitors") && canViewArrivals;
  const section = sectionForPage(currentSlug);
  const firstSection = DASHBOARD_SECTIONS.find(key => canAccess(profile,key));
  const completion = useStaffCompletionMonitor(canDashboard);
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{
    if(typeof window==="undefined")return false;
    try{return window.localStorage.getItem("barchi-sidebar-collapsed")==="1";}catch{return false;}
  });
  const toggleSidebar=()=>setSidebarCollapsed(value=>{
    const next=!value;
    try{window.localStorage.setItem("barchi-sidebar-collapsed",next?"1":"0");}catch{/* browser storage may be disabled */}
    return next;
  });
  const toolsButton = useRef<HTMLButtonElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const settings = useDashboardSettings();
  const showTools = settings.showTodo || settings.showReportHealth;
  const reportsReady = settings.showReportHealth && !!completion.data && !completion.error && !completion.isLoading;
  const reportsComplete = reportsReady && completion.data?.complete === true;
  const qc = useQueryClient();
  useEffect(() => {
    if (canViewArrivals) return;
    const sensitiveKeys = [
      ["recent-referrals"],
      ["historical-referrals"],
      ["problem-match-details"],
      ["visitor-archive"],
    ] as const;
    for (const queryKey of sensitiveKeys) {
      void qc.cancelQueries({ queryKey });
      qc.removeQueries({ queryKey });
    }
  }, [canViewArrivals, qc]);
  const navigate = useNavigate();
  const matchesQuery=useQuery({...recentReferralsQuery(60_000),enabled:canMatch});
  const matchCount=matchesQuery.data?.potentialMatches?.length??0;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  // Original eNID-inspired illustration: guilloche-like waves, mint/coral tones,
  // and a stylized Jam Minaret silhouette. No official security artwork is copied.
  const brand = (
    <div className="relative isolate mb-4 min-h-[132px] overflow-hidden rounded-2xl border border-[#e0c9a3] bg-[#fff2dc] px-4 py-4 pe-12 text-[#234d42] shadow-[0_6px_22px_-14px_rgba(70,91,65,.45)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse at 15% 12%,rgba(247,164,110,.46),transparent 59%),radial-gradient(ellipse at 95% 100%,rgba(69,205,163,.44),transparent 63%),linear-gradient(120deg,#fff4e5,#fce8d6 48%,#e7f5df)"}} />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 260 142" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="brand-micro-lines" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 Q4 0 8 8" stroke="#3caa8b" strokeWidth=".5" opacity=".26"/></pattern>
          <linearGradient id="brand-wave" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eeaa78"/><stop offset=".53" stopColor="#7ddbb1"/><stop offset="1" stopColor="#2dbd98"/></linearGradient>
          <linearGradient id="brand-minaret" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#bd8855"/><stop offset=".45" stopColor="#f3d6a4"/><stop offset="1" stopColor="#c39162"/></linearGradient>
        </defs>
        <path d="M0 0 H260 V142 H0Z" fill="url(#brand-micro-lines)" opacity=".55"/>
        {Array.from({length:17},(_,i)=><path key={i} d={`M-20 ${87+i*3.4} C37 ${24+i*3.4} 85 ${138+i*2.2} 146 ${72+i*3.3} S231 ${44+i*3.4} 280 ${76+i*3.4}`} stroke="url(#brand-wave)" strokeWidth={i%4===0?1.1:.62} opacity={i%4===0?.58:.39}/>)}
        {Array.from({length:8},(_,i)=><ellipse key={i} cx="27" cy="27" rx={24+i*5} ry={15+i*4.2} stroke="#f1a46f" strokeWidth=".55" opacity=".32"/>)}
        <g transform="translate(8 -1)" opacity=".73">
          <path d="M29 147 L36 56 L60 56 L68 147Z" fill="url(#brand-minaret)" stroke="#aa7549" strokeWidth="1"/>
          <path d="M35 56 L39 42 H57 L61 56Z M39 42 L42 30 H54 L57 42Z M42 30 L45 19 H51 L54 30Z M45 19 L48 10 L51 19Z" fill="#d5a371" stroke="#aa7549" strokeWidth=".9"/>
          <path d="M34 70 H62 M33 89 H64 M32 109 H65 M31 129 H67" stroke="#976e50" strokeWidth="3.4"/>
          <path d="M37 75 H61 M35 95 H63 M34 115 H64 M33 135 H65" stroke="#fff2cf" strokeWidth=".9" strokeDasharray="2 2"/>
          <path d="M42 61 V67 M49 61 V67 M55 61 V67 M40 79 V85 M49 79 V85 M57 79 V85 M39 99 V105 M49 99 V105 M59 99 V105 M37 119 V125 M49 119 V125 M61 119 V125" stroke="#9c734e" strokeWidth="2.6"/>
          <path d="M38 54 H59 M41 40 H56 M44 28 H53" stroke="#fff0c5" strokeWidth="1.5"/>
        </g>
        <path d="M3 139 H257" stroke="#b99562" strokeWidth=".7" opacity=".55"/>
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#fff4e6]/95 via-[#fff1e0]/78 to-transparent" />
      <div className="relative z-10 max-w-[165px]">
        <p className="text-[10px] font-bold tracking-[.12em] text-[#956744]">eNID · ۱۴۰۵</p>
        <h2 className="mt-2 font-display text-[17px] font-extrabold leading-7 text-[#1d5648]">د دشت برچي مرکز</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#557e6d]">د الکترونیکي تذکرې راپورونه</p>
      </div>
    </div>
  );

  return (
    <DashboardAccessContext.Provider value={profile}><div dir="rtl" lang="ps" className="min-h-screen md:flex">
      <a href="#main-dashboard-content" className="sr-only fixed start-4 top-2 z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only">اصلي منځپانګې ته لاړ شئ</a>
      <aside id="desktop-dashboard-sidebar" className={"no-print shrink-0 border-e border-sidebar-border bg-sidebar p-4 text-sidebar-foreground "+(sidebarCollapsed?"hidden":"hidden w-64 lg:block")}>
        <div className="sticky top-0 flex h-dvh flex-col py-3">
          {brand}
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pe-1"><Nav matchCount={matchCount} owner={profile?.owner===true} permissions={profile?.permissions ?? {}} /></div>
          {canAccess(profile, "settings") && <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink /></div>}
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(85vw,320px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-sidebar p-5 text-sidebar-foreground">
          <SheetTitle className="sr-only">مینو</SheetTitle>
          <div className="flex max-h-full flex-col">
            {brand}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Nav matchCount={matchCount} owner={profile?.owner===true} permissions={profile?.permissions ?? {}} onNavigate={() => setOpen(false)} /></div>
            {canAccess(profile, "settings") && <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink onNavigate={() => setOpen(false)} /></div>}
          </div>
        </SheetContent>
      </Sheet>
      {canDashboard && showTools && (
        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetContent side="center" dir="rtl" aria-describedby="tools-description" onCloseAutoFocus={event=>{event.preventDefault();toolsButton.current?.focus();}} className="no-print gap-0 bg-card p-0">
            <div className="shrink-0 border-b bg-muted/45 px-5 py-5 pe-16">
              <SheetTitle className="text-lg font-extrabold">دندې او د راپورونو بشپړتیا</SheetTitle>
              <p id="tools-description" className="mt-1 text-sm text-muted-foreground">خوندي دندې او د راپورونو د ثبت وضعیت</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <PinnedWidgets layout="stacked" />
            </div>
          </SheetContent>
        </Sheet>
      )}
      <div className="print-full flex-1 min-w-0">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-card/95 shadow-sm backdrop-blur-xl" aria-label="د سیستم ټاپ بار">
          <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl lg:hidden" onClick={() => setOpen(true)} aria-label="مینو خلاص کړئ"><Menu aria-hidden="true" className="h-5 w-5"/></Button>
            <Button type="button" variant="ghost" size="icon" className="hidden shrink-0 rounded-xl lg:inline-flex" onClick={toggleSidebar}
              aria-label={sidebarCollapsed?"سایډ بار خلاص کړئ":"سایډ بار بند کړئ"} aria-expanded={!sidebarCollapsed} aria-controls="desktop-dashboard-sidebar">
              {sidebarCollapsed?<SidebarOpenIcon aria-hidden="true" className="h-5 w-5"/>:<PanelRightClose aria-hidden="true" className="h-5 w-5"/>}
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <img src="/favicon.svg" alt="" width="32" height="32" className="size-8 shrink-0 rounded-lg" />
              <p className="truncate text-sm font-extrabold leading-6 text-foreground sm:text-base">{pageTitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <GlobalJalaliPicker />
              {canMatch && <ProblemNotificationBell matches={matchesQuery.data?.potentialMatches??[]}/>}
              {canDashboard && showTools && (
                <Button ref={toolsButton} variant="outline" size="icon" onClick={() => setToolsOpen(true)} aria-label="دندې او راپورونه" aria-haspopup="dialog" aria-expanded={toolsOpen}
                  title={reportsReady?(reportsComplete?"د راپورونو بشپړتیا تایید شوې":"د راپورونو بشپړتیا نیمګړې ده"):"دندې او راپورونه"}
                  className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-auto sm:gap-2 sm:px-3">
                  <PanelRightOpen aria-hidden="true" className="h-4 w-4"/>
                  <span className="hidden text-sm font-semibold sm:inline">دندې</span>
                  {reportsReady&&<span className={"hidden h-2 w-2 rounded-full md:inline-block "+(reportsComplete?"bg-emerald-500":"bg-rose-500")} aria-hidden="true"/>}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-auto sm:gap-2 sm:px-3" onClick={signOut} aria-label="له سیستم څخه وتل">
                <LogOut aria-hidden="true" className="h-4 w-4"/><span className="hidden text-sm sm:inline">وتل</span>
              </Button>
            </div>
          </div>
        </header>
        {profile?.owner && <ScheduledReportNotice />}
        {canMatch && <NewProblemVisitorNotice />}
        <main id="main-dashboard-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {access.isLoading ? (
            <p role="status" className="rounded-xl border bg-card p-5 text-muted-foreground">لاسرسی کتل کېږي…</p>
          ) : access.isError ? (
            <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-amber-500/35 bg-card p-6 text-center shadow-card">
              <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" aria-hidden="true" />
              <h1 className="mt-4 text-lg font-bold">د ننوتلو د تایید ستونزه</h1>
              <p className="mt-2 text-sm text-muted-foreground">ستاسو د حساب اجازه اوس د سرور له لارې نه شي تاییدېدای. دا د لاسرسي د رد کېدو معنا نه لري. د انټرنټ اړیکه او د سیستم تنظیمات وګورئ.</p>
              <Button className="mt-5" onClick={() => access.refetch()} disabled={access.isFetching}>بیا هڅه وکړئ</Button>
            </div>
          ) : !access.data?.allowed ? (
            <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-card">
              <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 text-xl font-bold">لاسرسی رد شو</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {access.data?.allowlistConfigured === false
                  ? "د لاسرسي تنظیمات بشپړ نه دي. له عمومي مدیر سره اړیکه ونیسئ."
                  : "ستاسو حساب ته د راپورونو د لیدلو اجازه نه ده ورکړل شوې. له عمومي مدیر څخه د صلاحیتونو فعالول وغواړئ."}
              </p>
              <Button className="mt-6" onClick={signOut}>د بل حساب سره ننوتل</Button>
            </div>
          ) : (
            canAccess(profile, section) ? <Outlet /> :
            section==="dashboard" && firstSection ? (
              firstSection==="reconciliation" ? <Navigate to="/dashboard/reconciliation" replace /> :
              firstSection==="center-quality" ? <Navigate to="/dashboard/center-quality" replace /> :
              <Navigate to="/dashboard/$slug" params={{slug:firstSection}} replace />
            ) : <p role="alert">دې برخې ته د لاسرسي اجازه نه لرئ.</p>
          )}
        </main>
      </div>
    </div></DashboardAccessContext.Provider>
  );
}

