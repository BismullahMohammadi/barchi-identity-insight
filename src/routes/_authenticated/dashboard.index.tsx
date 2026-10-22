import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DemoBadge, SyncBar } from "@/components/dash/SyncBar";
import { errorText, sheetQuery, dailyFormsQuery, dailyCoordinationQuery } from "@/lib/queries";
import { todayJalali, yesterdayJalali } from "@/lib/jalali";
import { normalizeGrid, sumColumn } from "@/lib/normalize";
import { OVERVIEW_SLUGS, getTab } from "@/lib/tabs";
import { periodRows, previousDayChange, type OverviewPeriod } from "@/lib/overview-period";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { PinnedWidgets } from "@/components/dash/PinnedWidgets";

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
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

// Clearly labeled sample shape shown only while live data is unavailable.
const DEMO = OVERVIEW_SLUGS.filter(s => s !== "services").map((s) => ({ slug: s, total: null as number | null, change: null as number | null }));

function Overview() {
  const settings = useDashboardSettings();
  const [period, setPeriod] = useState<OverviewPeriod>("all");
  const today = todayJalali();
  const yesterday = yesterdayJalali();
  const refreshMs = settingsRefreshMs(settings);
  const q = useQuery(sheetQuery(OVERVIEW_SLUGS, refreshMs));
  const daily = useQuery(dailyFormsQuery(refreshMs));
  const coordination = useQuery(dailyCoordinationQuery(refreshMs));

  const cards = useMemo(() => {
    if (!q.data) return null;
    return q.data.tabs.filter(t => t.slug !== "services").map((t) => {
      try {
        const n = normalizeGrid(t.grid, t.title);
        const col = SHEET_COLUMNS[t.title]?.primaryCol ?? null;
        const rows = periodRows(n, period, today);
        const isDated = n.dateCol >= 0;
        // Missing rows do not equal a real reported zero.
        const total = col === null || (period !== "all" && (!isDated || rows.length === 0))
          ? null : sumColumn(rows, col);
        const change = period === "today" && col !== null && isDated
          ? previousDayChange(n, col, today, yesterday) : null;
        return {slug: t.slug, total, change};
      } catch {
        return {slug: t.slug, total: null, change: null};
      }
    });
  // The chosen period changes independently of the polling results.
  }, [q.data, period, today.y, today.m, today.d, yesterday.y, yesterday.m, yesterday.d]);

  const demo = !cards;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground md:p-8">
        <div className="absolute inset-0 pattern-dots" aria-hidden />
        <div className="relative">
          <p className="text-sm text-sidebar-primary">د دشت برچي د الکترونیکي تذکرو مرکز</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold md:text-4xl">د ۱۴۰۵ کال عمومي کتنه</h1>
        </div>
      </section>

      <PinnedWidgets />

      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} refreshMs={refreshMs} />

      <div className="flex flex-wrap items-center gap-2" aria-label="د راپور موده">
        {([
          ["all", "ټول کال"],
          ["month", "روانه میاشت"],
          ["today", "نن"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className={period === value
              ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              : "rounded-lg border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"}>
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
        <section className="rounded-xl border bg-card p-4 shadow-card sm:p-5" aria-label="ورځني مراجعین">
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

      <div className={settings.compactCards ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
        {(cards ?? DEMO).map((c, i) => {
          const tab = getTab(c.slug)!;
          return (
            <Link key={c.slug} to="/dashboard/$slug" params={{ slug: c.slug }} className={settings.compactCards ? "group rounded-xl border bg-card p-3 shadow-card transition-transform hover:-translate-y-0.5" : "group rounded-xl border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5"}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{tab.label}</h3>
                {demo ? <DemoBadge /> : <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />}
              </div>

              <p className="mt-3 text-3xl font-extrabold" style={{ color: COLORS[i] }}>
                {q.isLoading ? "…" : c.total == null ? "—" : fmt(c.total)}
              </p>
              {c.change !== null && (
                <p className="mt-1 text-xs text-muted-foreground">د پرون پرتله: <strong className={c.change > 0 ? "text-emerald-600" : c.change < 0 ? "text-destructive" : "text-foreground"}>{c.change > 0 ? "+" : ""}{c.change}%</strong></p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
