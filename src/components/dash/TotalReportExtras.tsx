import { Link } from "@tanstack/react-router";
import { AlertTriangle, Baby, CalendarClock, FilePlus2, HeartHandshake, Banknote, Truck } from "lucide-react";
import { getSummaryMetrics, getTransferCount } from "@/lib/summary-metrics";

type TabData = { slug: string; title: string; grid: string[][] };
const format = (n: number) => n.toLocaleString("fa-AF");

export function TotalReportExtras({ tabs }: { tabs: TabData[] }) {
  const services = tabs.find(t => t.slug === "services");
  const arrivals = tabs.find(t => t.slug === "arrivals");
  let metrics: ReturnType<typeof getSummaryMetrics> | null = null;
  let transfers: number | null = null;
  let invalid = false;
  try {
    if (services) metrics = getSummaryMetrics(services.grid);
    if (arrivals) transfers = getTransferCount(arrivals.grid);
  } catch {
    invalid = true;
  }
  if (invalid) return (
    <p role="alert" className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">
      <AlertTriangle className="me-2 inline h-4 w-4" />
      د خدماتو یا د تذکرو د انتقالاتو کالمونه له ثبت شوې نقشې سره نه سمون لري.
    </p>
  );

  const cards = [
    { label: "مثنی", value: metrics?.duplicate, icon: FilePlus2, slug: "services" },
    { label: "تجدید", value: metrics?.renewal, icon: CalendarClock, slug: "services" },
    { label: "ثبت تولد", value: metrics?.births, icon: Baby, slug: "services" },
    { label: "ثبت ازدواج", value: metrics?.marriages, icon: HeartHandshake, slug: "services" },
    { label: "مثنی او تجدید عواید", value: metrics?.serviceRevenue, icon: Banknote, slug: "services", currency: true },
    { label: "د تذکرو انتقالات", value: transfers, icon: Truck, slug: "arrivals" },
  ];
  return (
    <section aria-label="د عمومي راپور اضافي شاخصونه" className="space-y-3">
      <h2 className="text-lg font-extrabold">نور شاخصونه</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, slug, currency }) => (
          <Link to="/dashboard/$slug" params={{ slug }} key={label}
            className="rounded-xl border bg-card p-4 shadow-card transition-colors hover:bg-accent/30">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{label}</h3>
              <Icon aria-hidden className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-extrabold tabular-nums">
              {value == null ? "—" : format(value)}
              {currency && value != null && <span className="ms-1 text-sm font-normal text-muted-foreground">AFN</span>}
            </p>
            {value == null && <p className="mt-1 text-xs text-muted-foreground">معلومات لا نه دي ترلاسه شوي</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
