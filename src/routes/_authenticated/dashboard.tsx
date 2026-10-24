import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldAlert, FileSpreadsheet, Settings, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/queries";
import { TABS } from "@/lib/tabs";
import { PinnedWidgets } from "@/components/dash/PinnedWidgets";
import { useDashboardSettings } from "@/lib/dashboard-settings";

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

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const cls = "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-primary";
  const active = { className: `${cls} bg-sidebar-accent text-sidebar-primary font-bold` };
  const groups = [
    { title: "د مرکز فعالیتونه", slugs: ["total", "identity", "control", "services", "distribution", "arrivals"] },
    { title: "مالي راپورونه", slugs: ["bank"] },
    { title: "نور راپورونه", slugs: ["annual"] },
  ];
  return (
    <nav aria-label="د ډشبورډ مینو" className="flex min-h-0 flex-col gap-3">
      <Link to="/dashboard" activeOptions={{ exact: true }} className={cls} activeProps={active} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4 shrink-0" /> عمومي کتنه
      </Link>
      {groups.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-sidebar-foreground/60">{group.title}</p>
          {group.slugs.map((slug) => {
            const tab = TABS.find((item) => item.slug === slug);
            if (!tab) return null;
            return (
              <Link key={slug} to="/dashboard/$slug" params={{ slug }}
                className={cls} activeProps={active} onClick={onNavigate}>
                <FileSpreadsheet className="h-4 w-4 shrink-0 opacity-70" />
                <span className="min-w-0 truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const cls = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent";
  return (
    <Link to="/dashboard/$slug" params={{ slug: "settings" }} className={cls}
      activeProps={{ className: `${cls} bg-sidebar-accent text-sidebar-primary font-bold` }}
      onClick={onNavigate}>
      <Settings className="h-4 w-4 shrink-0" /> تنظیمات
    </Link>
  );
}

function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const settings = useDashboardSettings();
  const showTools = settings.showTodo || settings.showAdvice;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useQuery(accessQuery);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const brand = (
    <div className="mb-5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-4">
      <p className="text-xs font-semibold tracking-wide text-sidebar-primary">eNID · ۱۴۰۵</p>
      <h2 className="mt-1 font-display text-lg font-extrabold">دشت برچي مرکز</h2>
      <p className="mt-1 text-xs text-sidebar-foreground/65">د مدیریتي راپورونو سیستم</p>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print hidden w-64 shrink-0 bg-sidebar p-4 text-sidebar-foreground md:block">
        <div className="sticky top-0 flex h-screen flex-col py-3">
          {brand}
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pe-1"><Nav /></div>
          <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink /></div>
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-sidebar p-5 text-sidebar-foreground">
          <SheetTitle className="sr-only">مینو</SheetTitle>
          <div className="flex max-h-full flex-col">
            {brand}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Nav onNavigate={() => setOpen(false)} /></div>
            <div className="mt-3 border-t border-sidebar-border pt-3"><SettingsLink onNavigate={() => setOpen(false)} /></div>
          </div>
        </SheetContent>
      </Sheet>
      {access.data?.allowed && showTools && (
        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetContent side="left" className="no-print flex h-full w-full max-w-md flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-[480px]">
            <div className="shrink-0 border-b px-5 pb-4 pt-6">
              <SheetTitle className="text-lg font-extrabold">دندې او مدیریتي مشوره</SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">د مرکز د کارونو شخصي وسایل؛ د راپورونو لید نه پټوي.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <PinnedWidgets layout="stacked" />
            </div>
          </SheetContent>
        </Sheet>
      )}
      <div className="print-full flex-1 min-w-0">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="مینو">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{access.data?.email ?? ""}</div>
          {access.data?.allowed && showTools && (
            <Button variant="outline" size="sm" onClick={() => setToolsOpen(true)} aria-label="دندې او مشوره پرانیزئ">
              <PanelRightOpen className="h-4 w-4" />
              <span className="hidden sm:inline">دندې او مشوره</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> وتل
          </Button>
        </header>
        <main className="px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {access.isLoading ? (
            <p className="text-muted-foreground">لاسرسی کتل کېږي…</p>
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
