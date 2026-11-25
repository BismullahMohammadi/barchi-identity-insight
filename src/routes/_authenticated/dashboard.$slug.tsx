import { lazy, Suspense } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/queries";
import { canAccess } from "@/lib/dashboard-access";
import { getTab, sectionLabels } from "@/lib/tabs";

const DashboardSettingsPage = lazy(() =>
  import("@/components/dash/DashboardSettingsPage").then((module) => ({
    default: module.DashboardSettingsPage,
  })),
);
const ManagedUsersPage = lazy(() =>
  import("@/components/dash/ManagedUsersPage").then((module) => ({
    default: module.ManagedUsersPage,
  })),
);
const SimpleDieselReport = lazy(() =>
  import("@/components/dash/SimpleDieselReport").then((module) => ({
    default: module.SimpleDieselReport,
  })),
);
const ProblemVisitorsPage = lazy(() =>
  import("@/components/dash/ProblemVisitorsPage").then((module) => ({
    default: module.ProblemVisitorsPage,
  })),
);
const ReportPage = lazy(() => import("@/components/dash/ReportPage"));

export const Route = createFileRoute("/_authenticated/dashboard/$slug")({
  beforeLoad: ({ params }) => {
    if (
      params.slug === "weekly" ||
      params.slug !== "admin-users" &&
      params.slug !== "settings" &&
      params.slug !== "problem-visitors" &&
      params.slug !== "fuel-management" &&
      !getTab(params.slug)
    )
      throw notFound();
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
  return (
    <Suspense fallback={<p role="status">برخه پرانیستل کېږي…</p>}>
      <Section slug={slug} />
    </Suspense>
  );
}

function Section({ slug }: { slug: string }) {
  if (slug === "admin-users")
    return (
      <OwnerOnly>
        <ManagedUsersPage />
      </OwnerOnly>
    );
  if (slug === "settings") return <PermissionOnly section="settings"><DashboardSettingsPage /></PermissionOnly>;
  if (slug === "problem-visitors") return <PermissionOnly section="problem-visitors"><ProblemVisitorsPage /></PermissionOnly>;
  if (slug === "fuel-management") return <PermissionOnly section="fuel-management"><SimpleDieselReport /></PermissionOnly>;
  return <PermissionOnly section={slug}><ReportPage slug={slug} /></PermissionOnly>;
}

function PermissionOnly({ section, children }: { section: string; children: React.ReactNode }) {
  const access = useQuery(accessQuery);
  if (access.isLoading) return <p>د لاسرسي ارزونه روانه ده…</p>;
  if (!canAccess(access.data, section))
    return <p role="alert">دې برخې ته د لیدلو اجازه نه لرئ.</p>;
  return <>{children}</>;
}

function OwnerOnly({ children }: { children: React.ReactNode }) {
  const access = useQuery(accessQuery);
  if (access.isLoading) return <p>د لاسرسي ارزونه روانه ده…</p>;
  if (access.data?.owner !== true)
    return <p role="alert">دې برخې ته یوازې عمومي مدیر لاسرسی لري.</p>;
  return <>{children}</>;
}
