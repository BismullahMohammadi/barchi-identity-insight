import { lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTab } from "@/lib/tabs";
import { useGlobalDateRange } from "@/lib/global-date-range";
import { SyncBar } from "@/components/dash/SyncBar";
import { TabView } from "@/components/dash/TabView";
import { errorText, sheetQuery } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { ManagementReport, isManagementReport } from "@/components/dash/ManagementReport";
const PassedFilesLookup = lazy(() =>
  import("@/components/dash/PassedFilesLookup").then((module) => ({
    default: module.PassedFilesLookup,
  })),
);
export default function ReportPage({ slug }: { slug: string }) {
  const tab = getTab(slug)!;
  const settings = useDashboardSettings();
  const { range } = useGlobalDateRange();
  const q = useQuery(sheetQuery([slug], settingsRefreshMs(settings)));
  const grid = q.data?.tabs[0]?.grid;

  return (
    <div className="space-y-5">
      <div className="dashboard-page-heading flex flex-wrap items-center justify-between gap-x-4">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">{tab.label}</h1>
        {slug === "identity" && (
          <img src="/tazkira-motif.webp" alt="" width="432" height="272" className="no-print h-auto w-16 -rotate-3 rounded-md shadow-sm ring-1 ring-black/10 sm:w-24" />
        )}
      </div>
      <SyncBar
        fetchedAt={q.data?.fetchedAt}
        isFetching={q.isFetching}
        error={q.error ? errorText(q.error) : null}
        onRefresh={() => q.refetch()}
        refreshMs={settingsRefreshMs(settings)}
      />
      {slug === "control" && <PassedFilesLookup />}
      {grid ? (
        isManagementReport(slug) ? (
          <ManagementReport
            key={slug}
            kind={slug}
            title={tab.title}
            grid={grid}
            dateRange={range ?? undefined}
          />
        ) : (
          <TabView key={slug} title={tab.title} grid={grid} dateRange={range ?? undefined} />
        )
      ) : q.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : q.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorText(q.error)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">د راپور معلومات نه دي ترلاسه شوي.</p>
      )}
    </div>
  );
}
