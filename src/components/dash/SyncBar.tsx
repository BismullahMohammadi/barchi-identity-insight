import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nowJalaliTime } from "@/lib/jalali";

export function SyncBar({
  fetchedAt, isFetching, error, onRefresh, refreshMs = 60_000,
}: { fetchedAt?: number | undefined; isFetching: boolean; error?: string | null; onRefresh: () => void; refreshMs?: number }) {
  return (
    <div className="no-print dashboard-panel flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      {error ? (
        <span role="alert" className="flex items-center gap-2 text-destructive"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{error}</span>
      ) : fetchedAt ? (
        <span className="flex items-center gap-2 text-primary"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />همغږي شو: {nowJalaliTime(fetchedAt)}</span>
      ) : (
        <span role="status" className="text-muted-foreground">همغږي روانه ده…</span>
      )}
      <span className="text-xs text-muted-foreground">هر {Math.round(refreshMs / 1000)} ثانیې تازه کېږي</span>
      <Button variant="ghost" size="sm" className="ms-auto" onClick={onRefresh} disabled={isFetching}>
        <RefreshCw aria-hidden="true" className={isFetching ? "animate-spin" : ""} /> {isFetching ? "تازه کېږي…" : "اوس تازه کړئ"}
      </Button>
    </div>
  );
}
export function DemoBadge() {
  return <span className="rounded bg-warning px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent-foreground">DEMO</span>;
}

