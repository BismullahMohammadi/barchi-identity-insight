import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SyncBar } from "@/components/dash/SyncBar";
import { TabView } from "@/components/dash/TabView";
import { errorText, sheetQuery } from "@/lib/queries";
import { getTab, TOTAL_REPORT_SLUGS } from "@/lib/tabs";
import { TotalReportExtras } from "@/components/dash/TotalReportExtras";

export const Route = createFileRoute("/_authenticated/dashboard/$slug")({
  beforeLoad: ({ params }) => {
    if (!getTab(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const t = getTab(params.slug);
    const title = `${t?.label ?? "پاڼه"} — دشت برچي eNID ۱۴۰۵`;
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
  const tab = getTab(slug)!;
  const settings = useDashboardSettings();
  const q = useQuery(sheetQuery(slug === "total" ? TOTAL_REPORT_SLUGS : [slug], settingsRefreshMs(settings)));
  const grid = q.data?.tabs[0]?.grid;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">{tab.label}</h1>
        <p className="text-sm text-muted-foreground">{tab.description}</p>
      </div>
      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} />
      {slug === "total" && q.data && <TotalReportExtras tabs={q.data.tabs} />}
      {grid ? <TabView key={slug} title={tab.label} grid={grid} /> : q.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : null}
    </div>
  );
}
