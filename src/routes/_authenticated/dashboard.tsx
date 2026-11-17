import {GlobalDateProvider} from "@/lib/global-date-range";
import {GlobalJalaliPicker} from "@/components/dash/GlobalJalaliPicker";
import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { todayJalali, JALALI_MONTHS } from "@/lib/jalali";
import { LayoutDashboard, Fuel, AlertTriangle, LogOut, Menu, ShieldAlert, Settings, PanelRightOpen, ContactRound, ClipboardCheck, Landmark, Blocks, PackageCheck, Truck, CalendarRange, Files, ScanLine, PanelRightClose, PanelRightOpen as SidebarOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, recentReferralsQuery } from "@/lib/queries";
import { TABS } from "@/lib/tabs";
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

function Nav({ onNavigate,matchCount=0,owner=false,permissions={} }: { onNavigate?: () => void; matchCount?:number; owner?:boolean; permissions?:Record<string,string[]> }) {
  const canView=(section:string)=>owner || permissions[section]?.includes("view")===true;
  const icons: Record<string, typeof Files> = {total:Files,identity:ContactRound,control:ClipboardCheck,services:Blocks,distribution:PackageCheck,arrivals:Truck,"archive-scan":ScanLine,bank:Landmark,annual:CalendarRange};
  const cls = "group flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none hover:bg-sidebar-accent hover:translate-x-[-2px] focus-visible:ring-2 focus-visible:ring-sidebar-primary";
  const active = { className: `${cls} border-sidebar-primary/20 bg-sidebar-accent text-sidebar-foreground font-extrabold shadow-sm` };
  const groups = [
    { title: "اصلي عملیاتي راپورونه", slugs: ["total", "identity", "control", "services", "distribution", "bank"] },
    { title: "نور راپورونه", slugs: ["arrivals", "archive-scan", "annual"] },
  ];
  return (
    <nav aria-label="د ډشبورډ مینو" className="flex min-h-0 flex-col gap-4">
      {canView("dashboard") && <Link to="/dashboard" activeOptions={{ exact: true }} className={cls} activeProps={active} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4 shrink-0" /> د مرکز کاري بهیر
      </Link>}
      {canView("problem-visitors") && <Link to="/dashboard/$slug" params={{ slug: "problem-visitors" }} className={cls} activeProps={active} onClick={onNavigate}>
        <AlertTriangle className="h-4 w-4 shrink-0" /> <span className="min-w-0 flex-1">مشکلاتي مراجعین</span>{matchCount>0&&<span aria-label={`د احتمالي تطابق شمېر ${matchCount}`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-extrabold text-amber-950 dark:bg-amber-800 dark:text-white">{matchCount>99?"99+":matchCount}</span>}
      </Link>}
      {groups.map((group) => (
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
      <div className="space-y-1 border-t border-sidebar-border pt-3">
        <p className="px-3 pb-1 text-xs font-semibold text-sidebar-foreground/60">اداري او مرستندویه برخې</p>
        {owner && <Link to="/dashboard/$slug" params={{ slug: "admin-users" }} className={cls} activeProps={active} onClick={onNavigate}><ShieldAlert className="h-4 w-4 shrink-0" /> د کاروونکو مدیریت</Link>}
        {canView("reconciliation") && <Link to="/dashboard/reconciliation" className={cls} activeProps={active} onClick={onNavigate}><ClipboardCheck className="h-4 w-4 shrink-0" /> د راپورونو مطابقت</Link>}
        {canView("center-quality") && <Link to="/dashboard/center-quality" className={cls} activeProps={active} onClick={onNavigate}><ClipboardCheck className="h-4 w-4 shrink-0" /> د مرکزونو د فعالیت پرتله</Link>}
        {canView("fuel-management") && <Link to="/dashboard/$slug" params={{ slug: "fuel-management" }} className={cls} activeProps={active} onClick={onNavigate}><Fuel className="h-4 w-4 shrink-0" /> د تېلو او ډیزلو مدیریت</Link>}
      </div>
    </nav>
  );
}
function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const cls = "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-primary";
  return (
    <Link to="/dashboard/$slug" params={{ slug: "settings" }} className={cls}
      activeProps={{ className: `${cls} bg-sidebar-accent text-sidebar-primary font-bold` }}
      onClick={onNavigate}>
      <Settings className="h-4 w-4 shrink-0" /> تنظیمات
    </Link>
  );
}

function DashboardLayout(){return <GlobalDateProvider><DashboardLayoutContent/></GlobalDateProvider>;}
function DashboardLayoutContent() {
  // Watch completion while authenticated even if the tools drawer is closed.
  const pathname = useLocation({ select: (location) => location.pathname });
  const currentSlug = pathname.split("/").filter(Boolean).at(-1);
  const pageTitle = currentSlug === "center-quality" ? "د مرکزونو د فعالیت پرتله" : currentSlug === "reconciliation" ? "د راپورونو مطابقت" : currentSlug === "dashboard" ? "د مرکز کاري بهیر" : currentSlug === "admin-users" ? "د کاروونکو مدیریت" : currentSlug === "settings" ? "تنظیمات" : currentSlug === "fuel-management" ? "د تېلو او ډیزلو مدیریت" : currentSlug === "problem-visitors" ? "مشکلاتي مراجعین" : TABS.find((tab) => tab.slug === currentSlug)?.label ?? "د مرکز مدیریتي سیسټم";
  const completion = useStaffCompletionMonitor();
  const [open, setOpen] = useState(false);
  const [today,setToday]=useState<ReturnType<typeof todayJalali>|null>(null);
  useEffect(()=>{const update=()=>setToday(todayJalali());update();const timer=window.setInterval(update,60_000);return ()=>window.clearInterval(timer);},[]);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{
    if(typeof window==="undefined")return false;
    try{return window.localStorage.getItem("barchi-sidebar-collapsed")==="1";}catch{return false;}
  });
  const toggleSidebar=()=>setSidebarCollapsed(value=>{
    const next=!value;
    try{window.localStorage.setItem("barchi-sidebar-collapsed",next?"1":"0");}catch{/* browser storage may be disabled */}
    return next;
  });
  const [toolsOpen, setToolsOpen] = useState(false);
  const settings = useDashboardSettings();
  const showTools = settings.showTodo || settings.showReportHealth;
  const reportsReady = settings.showReportHealth && !!completion.data && !completion.error && !completion.isLoading;
  const reportsComplete = reportsReady && completion.data?.complete === true;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useQuery(accessQuery);
  const matchesQuery=useQuery({...recentReferralsQuery(60_000),enabled:access.data?.allowed===true});
  const matchCount=matchesQuery.data?.potentialMatches?.length??0;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const brand = (
    <div className="mb-5 rounded-2xl border border-sidebar-border bg-sidebar-accent/35 px-4 py-5">
      <p className="text-xs font-semibold tracking-wide text-sidebar-primary">eNID · ۱۴۰۵</p>
      <h2 className="mt-1 font-display text-lg font-extrabold">دشت برچي مرکز</h2>
      <p className="mt-1 text-xs text-sidebar-foreground/65">د مدیریتي راپورونو سیستم</p>
    </div>
  );

  return (
    <div dir="rtl" lang="ps" className="min-h-screen md:flex">
      <a href="#main-dashboard-content" className="sr-only fixed start-4 top-2 z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only">اصلي منځپانګې ته لاړ شئ</a>
      <aside id="desktop-dashboard-sidebar" className={"no-print shrink-0 border-e border-sidebar-border bg-sidebar p-4 text-sidebar-foreground "+(sidebarCollapsed?"hidden":"hidden w-64 lg:block")}>
        <div className="sticky top-0 flex h-screen flex-col py-3">
          {brand}
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pe-1"><Nav matchCount={matchCount} owner={access.data?.owner===true} permissions={access.data?.permissions ?? {}} /></div>
          <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink /></div>
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(85vw,320px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-sidebar p-5 text-sidebar-foreground">
          <SheetTitle className="sr-only">مینو</SheetTitle>
          <div className="flex max-h-full flex-col">
            {brand}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Nav matchCount={matchCount} owner={access.data?.allowed===true} onNavigate={() => setOpen(false)} /></div>
            <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink onNavigate={() => setOpen(false)} /></div>
          </div>
        </SheetContent>
      </Sheet>
      {access.data?.allowed && showTools && (
        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetContent side="left" className="no-print flex h-full w-full max-w-md flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-[480px]">
            <div className="shrink-0 border-b px-5 pb-4 pt-6">
              <SheetTitle className="text-lg font-extrabold">دندې او د راپورونو بشپړتیا</SheetTitle>
              <p className="mt-1 text-sm text-muted-foreground">خوندي دندې او د راپورونو د ثبت وضعیت</p>
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold leading-6 text-foreground sm:text-base">{pageTitle}</p>
              <p className="hidden truncate text-xs text-muted-foreground md:block">د دشت برچي د الکترونیکي تذکرو مرکز</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <GlobalJalaliPicker />
              {access.data?.allowed && <ProblemNotificationBell matches={matchesQuery.data?.potentialMatches??[]}/>}
              {access.data?.allowed && showTools && (
                <Button variant="outline" size="icon" onClick={() => setToolsOpen(true)} aria-label="دندې او راپورونه" aria-haspopup="dialog" aria-expanded={toolsOpen}
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
        {access.data?.allowed && <ScheduledReportNotice />}
        {access.data?.allowed && <NewProblemVisitorNotice />}
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
                  ? "د مالک ایمیل لیست لا نه دی ترتیب شوی، نو ټول لاسرسي بند دي."
                  : "دا حساب د اجازه لرونکو ایمیلونو په لیست کې نشته."}
              </p>
              <Button className="mt-6" onClick={signOut}>د بل حساب سره ننوتل</Button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

