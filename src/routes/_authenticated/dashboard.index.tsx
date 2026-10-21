import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowLeft } from "lucide-react";
import { DemoBadge, SyncBar } from "@/components/dash/SyncBar";
import { errorText, sheetQuery, dailyFormsQuery } from "@/lib/queries";
import { formatJ } from "@/lib/jalali";
import { isTotalRow, normalizeGrid, sumColumn } from "@/lib/normalize";
import { OVERVIEW_SLUGS, getTab } from "@/lib/tabs";
import { sheetSchema } from "@/lib/sheet-schema";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";
import { getSummaryMetrics } from "@/lib/summary-metrics";

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
const DEMO = OVERVIEW_SLUGS.map((s) => ({ slug: s, total: null as number | null, header: "د اصلي معلوماتو انتظار" }));

function Overview() {
  const q = useQuery(sheetQuery(OVERVIEW_SLUGS));
  const daily = useQuery(dailyFormsQuery);

  const cards = useMemo(() => {
    if (!q.data) return null;
    return q.data.tabs.filter(t => t.slug !== "services").map((t) => {
      let n;
      try { n = normalizeGrid(t.grid, t.title); }
      catch { return { slug: t.slug, total: null, header: "د شیټ د کالمونو نقشه تایید ته اړتیا لري", series: [], rows: 0 }; }
      const col = SHEET_COLUMNS[t.title]?.primaryCol ?? null;
      const series = col == null ? [] : n.rows
        .map((r, i) => ({ r, d: n.dates[i] }))
        .filter(({ r }) => !isTotalRow(r))
        .map(({ r, d }) => ({ x: d ? formatJ(d).slice(5) : "", v: typeof r[col] === "number" ? (r[col] as number) : 0 }));
      return { slug: t.slug, total: col == null ? null : sumColumn(n.rows, col), header: col == null ? "" : n.headers[col], series, rows: n.rows.length };
    });
  }, [q.data]);

  const demo = !cards;
  const servicesGrid = q.data?.tabs.find(t => t.slug === "services")?.grid;
  let extras: ReturnType<typeof getSummaryMetrics> | null = null;
  try { if (servicesGrid) extras = getSummaryMetrics(servicesGrid); } catch { /* The sheet mapping error is shown on its detail page. */ }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground md:p-8">
        <div className="absolute inset-0 pattern-dots" aria-hidden />
        <div className="relative">
          <p className="text-sm text-sidebar-primary">د دشت برچي د الکترونیکي تذکرو مرکز</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold md:text-4xl">د ۱۴۰۵ کال عمومي کتنه</h1>
        </div>
      </section>

      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} />

      {demo && !q.isLoading && (
        <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          <DemoBadge /> لاندې شمېرې نمونه دي، اصلي معلومات نه دي. کله چې شیټ په خوندي ډول وصل شي، اصلي شمېرې ښکاري.
        </p>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-card" aria-label="د ورځني معرفي شويو فورمونو راپور">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">د ورځې معرفي شوي فورمونه</h2>
          <span className="text-xs text-muted-foreground">{daily.data?.tabName ?? "د ورځې ټب نه دی موندل شوی"}</span>
        </div>
        {daily.error && <p role="alert" className="mt-2 text-sm text-destructive">{errorText(daily.error)}</p>}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">AH2 — د ورځې مجموعه</p>
            <p className="mt-1 text-2xl font-bold">{daily.isLoading ? "…" : daily.data?.ah2 ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">AI2 — دویم ارزښت</p>
            <p className="mt-1 text-2xl font-bold">{daily.isLoading ? "…" : daily.data?.ai2 ?? "—"}</p>
          </div>
        </div>
        {daily.data?.tabName && <p className="mt-2 text-xs text-muted-foreground">د {daily.data.date} نېټې وروستی موجود راپور — تش سیل صفر نه شمېرل کېږي</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(cards ?? DEMO.map((d) => ({ ...d, series: [], rows: 0 }))).map((c, i) => {
          const tab = getTab(c.slug)!;
          return (
            <Link key={c.slug} to="/dashboard/$slug" params={{ slug: c.slug }} className="group rounded-xl border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{tab.label}</h3>
                {demo ? <DemoBadge /> : <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{c.header}</p>
              <p className="mt-3 text-3xl font-extrabold" style={{ color: COLORS[i] }}>
                {q.isLoading ? "…" : c.total == null ? "—" : fmt(c.total)}
              </p>
              {c.slug === "total" && extras && (
                <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
                  <span>مثنی: <strong className="text-foreground">{extras.duplicate.toLocaleString("fa-AF")}</strong></span>
                  <span>تجدید: <strong className="text-foreground">{extras.renewal.toLocaleString("fa-AF")}</strong></span>
                </div>
              )}
              {c.slug === "revenue" && extras && (
                <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">د مثنی او تجدید عواید: <strong className="text-foreground">{extras.serviceRevenue.toLocaleString("fa-AF")} AFN</strong></div>
              )}
              {c.series.length > 1 && (
                <div className="mt-3 h-16" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={c.series}>
                      <XAxis dataKey="x" hide reversed />
                      <Tooltip contentStyle={{ fontFamily: "Vazirmatn" }} />
                      <Area type="monotone" dataKey="v" stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
