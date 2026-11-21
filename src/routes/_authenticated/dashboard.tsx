import { DashboardAccessContext } from "@/lib/dashboard-access-context";
import {GlobalDateProvider} from "@/lib/global-date-range";
import {GlobalJalaliPicker} from "@/components/dash/GlobalJalaliPicker";
import { createFileRoute, Link, Navigate, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
  const canMatch = canDashboard && canAccess(profile, "problem-visitors");
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
  const navigate = useNavigate();
  const matchesQuery=useQuery({...recentReferralsQuery(60_000),enabled:canMatch});
  const matchCount=matchesQuery.data?.potentialMatches?.length??0;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  // Decorative Jam Minaret motif: stylized illustration, not a reproduction of a security document.
  const brand = (
    <div className="relative mb-4 isolate min-h-[116px] overflow-hidden rounded-2xl border border-[#b69a5a]/40 bg-[#123b36] px-4 py-4 pe-12 text-[#fff9e9] shadow-[0_8px_24px_-14px_rgba(10,45,38,0.8)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80" style={{background:"radial-gradient(circle at 90% 0%, rgba(219,181,99,.23), transparent 55%), repeating-linear-gradient(125deg, transparent 0px, transparent 15px, rgba(232,202,139,.055) 16px, transparent 17px)"}} />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 110 170" className="pointer-events-none absolute bottom-[-20px] left-[-5px] h-[155px] w-[105px] opacity-[.32]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M38 154 L45 50 L66 50 L73 154 Z" fill="#d4b16c" stroke="#f5dba0" strokeWidth="1.5"/>
        <path d="M45 50 L49 35 L62 35 L66 50 Z M48 35 L51 24 L60 24 L63 35 Z M51 24 L54 15 L57 15 L60 24 Z" fill="#d4b16c" stroke="#f5dba0" strokeWidth="1.3"/>
        <path d="M42 77 H69 M41 96 H70 M40 117 H71 M39 137 H72" stroke="#244a40" strokeWidth="4"/>
        <path d="M44 83 L68 83 M43 103 L69 103 M42 123 L70 123" stroke="#f9e8b9" strokeWidth="1" strokeDasharray="3 3"/>
        <path d="M54 57 V69 M59 57 V69 M51 87 V93 M60 87 V93 M49 108 V114 M62 108 V114" stroke="#31584d" strokeWidth="3"/>
        <path d="M22 158 H90 M15 164 H97" stroke="#f2d79c" strokeWidth="1" opacity=".7"/>
        <path d="M11 42 Q56 2 100 42 M6 52 Q56 9 105 52" stroke="#d9bc7e" strokeWidth="1" opacity=".5"/>
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-2 h-px bg-gradient-to-l from-transparent via-[#d7b56d]/65 to-transparent" />
      <div className="relative z-10 max-w-[165px]">
        <p className="text-[11px] font-bold tracking-[.12em] text-[#e8cb8e]">eNID · ۱۴۰۵</p>
        <h2 className="mt-2 font-display text-[17px] font-extrabold leading-7 text-[#fff9e9]">د دشت برچي مرکز</h2>
        <p className="mt-1 text-[10px] font-medium text-[#e5d8b5]">د الکترونیکي تذکرې راپورونه</p>
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

