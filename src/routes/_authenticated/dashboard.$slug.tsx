import {useGlobalDateRange} from "@/lib/global-date-range";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/queries";
import { SyncBar } from "@/components/dash/SyncBar";
import { TabView } from "@/components/dash/TabView";
import { errorText, sheetQuery } from "@/lib/queries";
import { getTab, sectionLabels } from "@/lib/tabs";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import { DashboardSettingsPage } from "@/components/dash/DashboardSettingsPage";
import { ManagementReport, isManagementReport } from "@/components/dash/ManagementReport";
import { ProblemVisitorsPage } from "@/components/dash/ProblemVisitorsPage";
import { SimpleDieselReport } from "@/components/dash/SimpleDieselReport";
import { ManagedUsersPage } from "@/components/dash/ManagedUsersPage";
import { PassedFilesLookup } from "@/components/dash/PassedFilesLookup";

export const Route = createFileRoute("/_authenticated/dashboard/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug !== "admin-users" && params.slug !== "settings" && params.slug !== "problem-visitors" && params.slug !== "fuel-management" && !getTab(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const t = getTab(params.slug);
    const title = `${sectionLabels[params.slug] ?? "راپور"} — د دشت برچي مرکز`;
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
  if (slug === "admin-users") return <OwnerOnly><ManagedUsersPage /></OwnerOnly>;
  if (slug === "settings") return <DashboardSettingsPage />;
  if (slug === "problem-visitors") return <ProblemVisitorsPage />;
  if (slug === "fuel-management") return <SimpleDieselReport />;
  return <ReportPage slug={slug} />;
}

function OwnerOnly({children}:{children:React.ReactNode}) {
  const access=useQuery(accessQuery);
  if(access.isLoading)return <p>د لاسرسي ارزونه روانه ده…</p>;
  if(access.data?.owner!==true)return <p role="alert">دې برخې ته یوازې عمومي مدیر لاسرسی لري.</p>;
  return <>{children}</>;
}
function ReportPage({slug}:{slug:string}) {
  const tab = getTab(slug)!;
  const settings = useDashboardSettings();
  const {range}=useGlobalDateRange();
  const q = useQuery(sheetQuery([slug], settingsRefreshMs(settings)));
  const grid = q.data?.tabs[0]?.grid;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">{tab.label}</h1>
      </div>
      <SyncBar fetchedAt={q.data?.fetchedAt} isFetching={q.isFetching} error={q.error ? errorText(q.error) : null} onRefresh={() => q.refetch()} refreshMs={settingsRefreshMs(settings)} />
      {slug === "control" && <PassedFilesLookup />}
      {grid ? (isManagementReport(slug)
        ? <ManagementReport key={slug} kind={slug} title={tab.title} grid={grid} dateRange={range??undefined}/>
        : <TabView key={slug} title={tab.title} grid={grid} dateRange={range??undefined}/>) : q.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : q.error ? <p role="alert" className="text-sm text-destructive">{errorText(q.error)}</p> : <p className="text-sm text-muted-foreground">د راپور معلومات نه دي ترلاسه شوي.</p>}
    </div>
  );
}
