import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldAlert, FileSpreadsheet, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/queries";
import { TABS } from "@/lib/tabs";

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
  const cls = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent";
  const active = { className: `${cls} bg-sidebar-accent text-sidebar-primary font-bold` };
  return (
    <nav className="flex flex-col gap-1">
      <Link to="/dashboard" activeOptions={{ exact: true }} className={cls} activeProps={active} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4" /> عمومي کتنه
      </Link>
      <Link to="/dashboard/$slug" params={{slug:"settings"}} className={cls} activeProps={active} onClick={onNavigate}>
        <Settings className="h-4 w-4" /> سیټینګونه
      </Link>
      {TABS.map((t) => (
        <Link key={t.slug} to="/dashboard/$slug" params={{ slug: t.slug }} className={cls} activeProps={active} onClick={onNavigate}>
          <FileSpreadsheet className="h-4 w-4 opacity-70" /> {t.label}
        </Link>
      ))}
    </nav>
  );
}

function DashboardLayout() {
  const [open, setOpen] = useState(false);
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
    <div className="mb-6">
      <p className="text-xs text-sidebar-primary">eNID · ۱۴۰۵</p>
      <h2 className="font-display text-lg font-extrabold">دشت برچي مرکز</h2>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print hidden w-64 shrink-0 bg-sidebar p-5 text-sidebar-foreground md:block">
        <div className="sticky top-5">
          {brand}
          <Nav />
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 bg-sidebar p-5 text-sidebar-foreground">
          <SheetTitle className="sr-only">مینو</SheetTitle>
          {brand}
          <Nav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="print-full flex-1 min-w-0">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="مینو">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{access.data?.email ?? ""}</div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> وتل
          </Button>
        </header>
        <main className="px-4 py-6 md:px-8">
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
