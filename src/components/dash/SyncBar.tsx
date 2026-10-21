import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nowJalaliTime } from "@/lib/jalali";

export function SyncBar({
  fetchedAt, isFetching, error, onRefresh,
}: { fetchedAt?: number | undefined; isFetching: boolean; error?: string | null; onRefresh: () => void }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm shadow-card">
      {error ? (
        <span role="alert" className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />{error}</span>
      ) : fetchedAt ? (
        <span className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" />همغږي شو: {nowJalaliTime(fetchedAt)}</span>
      ) : (
        <span className="text-muted-foreground">همغږي روانه ده…</span>
      )}
      <span className="text-xs text-muted-foreground">هر ۶۰ ثانیې تازه کېږي</span>
      <Button variant="ghost" size="sm" className="ms-auto" onClick={onRefresh} disabled={isFetching}>
        <RefreshCw className={isFetching ? "animate-spin" : ""} /> اوس تازه کړئ
      </Button>
    </div>
  );
}
export function DemoBadge() {
  return <span className="rounded bg-warning px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent-foreground">DEMO</span>;
}
