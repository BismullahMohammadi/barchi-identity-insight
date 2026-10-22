import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SyncBar } from "@/components/dash/SyncBar";
import { TabView } from "@/components/dash/TabView";
import { errorText, sheetQuery } from "@/lib/queries";
import { getTab, TOTAL_REPORT_SLUGS } from "@/lib/tabs";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { DashboardSettingsPage } from "@/components/dash/DashboardSettingsPage";
import { TotalReportExtras } from "@/components/dash/TotalReportExtras";

export const Route = createFileRoute("/_authenticated/dashboard/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug !== "settings" && !getTab(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const t = getTab(params.slug);
    const title = `${params.slug === "settings" ? "تنظیمات" : (t?.label ?? "پاڼه")} — دشت برچي eNID ۱۴۰۵`;
    return {
      meta: [
        { title },
        { name: "description", content: t?.description ?? "خصوصي راپور" },
        { property: "og:title", content: title },
        { property: "og:description", content: t?.description ?? "خصوصي راپور" },
      ],
    };
  },
  component: TabPage,
});

function TabPage() {
  const { slug } = Route.useParams();
  if (slug === "settings") return <DashboardSettingsPage />;
  return <ReportPage slug={slug} />;
}

function ReportPage({slug}:{slug:string}) {
  const tab = getTab(slug)!;
  const settings = useDashboardSettings();
  const q = useQuery(sheetQuery(slug === "total" ? TOTAL_REPORT_SLUGS : [slug], settingsRefreshMs(settings)));
  const grid = q.data?.tabs[0]?.grid;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">{tab.label}</h1>
      </div>
      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} refreshMs={settingsRefreshMs(settings)} />
      {slug === "total" && q.data && (
        <details className="rounded-xl border bg-card p-4 shadow-card">
          <summary className="cursor-pointer text-sm font-semibold">نور شاخصونه</summary>
          <div className="mt-4"><TotalReportExtras tabs={q.data.tabs} /></div>
        </details>
      )}
      {grid ? <TabView key={slug} title={tab.title} grid={grid} /> : q.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : q.error ? <p role="alert" className="text-sm text-destructive">{errorText(q.error)}</p> : <p className="text-sm text-muted-foreground">د راپور معلومات نه دي ترلاسه شوي.</p>}
    </div>
  );
}
