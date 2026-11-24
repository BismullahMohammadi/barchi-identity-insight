import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getArchiveReconciliation } from "@/lib/archive-reconciliation.functions";
import type { ArchiveComparisonRow, ArchiveMetric } from "@/lib/archive-reconciliation";
import { JALALI_MONTHS, parseJalali } from "@/lib/jalali";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (value: number | null) => (value === null ? "—" : value.toLocaleString("fa-AF"));
const metricLabels: Record<ArchiveMetric, string> = {
  ordinary: "عادي آرشیف · جدید او ثبت تولد",
  service: "خدمات آرشیف · مثنی او تجدید",
};

function sumComparable(rows: ArchiveComparisonRow[], key: "employee" | "archive") {
  return rows.reduce(
    (total, row) =>
      row.status === "equal" || row.status === "mismatch" ? total + (row[key] ?? 0) : total,
    0,
  );
}

export function ArchiveReconciliationMatrix({ year, month }: { year: number; month: number }) {
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [selected, setSelected] = useState<ArchiveComparisonRow | null>(null);
  const report = useQuery({
    queryKey: ["archive-reconciliation", year, month],
    queryFn: () => getArchiveReconciliation({ data: { year, month } }),
    staleTime: 120000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const rows = report.data?.rows ?? [];
  const mismatchCount = rows.filter((row) => row.status === "mismatch").length;
  const equalCount = rows.filter((row) => row.status === "equal").length;
  const missingCount = rows.filter(
    (row) => row.status === "missing" || row.status === "holiday",
  ).length;
  const monthDays = month <= 6 ? 31 : month <= 11 ? 30 : parseJalali(`${year}/12/30`) ? 30 : 29;
  const allDays = Array.from({ length: monthDays }, (_, index) => index + 1);
  const days = onlyDifferences
    ? allDays.filter((day) => rows.some((row) => row.day === day && row.status === "mismatch"))
    : allDays;
  const visibleRows = new Map(rows.map((row) => [`${row.metric}:${row.day}`, row]));
  const selectedRow = selected ? visibleRows.get(`${selected.metric}:${selected.day}`) : null;

  return (
    <section
      data-print-target
      className="space-y-3"
      aria-label="د کارکوونکو او آرشیف راپورونو مطابقت"
    >
      <h2 className="hidden print:block">
        د کارکوونکو او آرشیف راپورونو مطابقت · {JALALI_MONTHS[month - 1]} {fmt(year)}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 print:hidden">
        <div>
          <h2 className="text-sm font-semibold">د کارکوونکو د آرشیف معلوماتو پرتله</h2>
          <p className="text-xs text-muted-foreground">
            {JALALI_MONTHS[month - 1]} {fmt(year)}
            {report.data &&
              ` · د کارکوونکو ټب: ${report.data.employeeTab} · د آرشیف ټب: ${report.data.archiveTab}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={onlyDifferences}
              onChange={(event) => setOnlyDifferences(event.target.checked)}
            />
            یوازې توپیر لرونکې ورځې
          </label>
          <Button
            variant="outline"
            size="icon"
            aria-label="تازه کول"
            disabled={report.isFetching}
            onClick={() => void report.refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${report.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {report.isLoading && (
        <p role="status" className="p-4">
          د آرشیف راپورونه لوستل کېږي…
        </p>
      )}
      {report.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          د ټاکل شوې میاشتې د کارکوونکو یا آرشیف راپور ونه لوستل شو. د میاشتني ټب او Google Sheets
          لاسرسی وګورئ.
        </p>
      )}
      {report.data && (
        <>
          {(
            [
              ["د کارکوونکو راپور", report.data.sources.employee],
              ["آرشیف", report.data.sources.archive],
            ] as const
          ).map(([label, source]) =>
            !source.headerFound ? (
              <p
                key={label}
                role="status"
                className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
              >
                په {label} کې د نوم، فعالیت او ورځو سرلیکونه ونه پېژندل شول؛ شمېرې نه دي اټکل شوې.
              </p>
            ) : !source.ordinaryActivities || !source.serviceActivities ? (
              <p
                key={label}
                role="status"
                className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
              >
                په {label} کې د عادي یا خدماتو آرشیف فعالیت قطار ونه موندل شو؛ تشې شمېرې صفر نه ګڼل
                کېږي.
              </p>
            ) : null,
          )}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["برابر", equalCount],
                ["توپیر", mismatchCount],
                ["معلومات نشته", missingCount],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="rounded-xl border p-3 text-center">
                <p
                  className={`text-xl font-bold tabular-nums ${label === "توپیر" && count ? "text-destructive" : ""}`}
                >
                  {fmt(count)}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-4 text-xs text-muted-foreground"
            aria-label="د جدول نښې"
          >
            <span>✓ برابر</span>
            <span>سور عدد: توپیر (د کارمندانو راپور − آرشیف)</span>
            <span>ج: جمعه ـ رخصتي</span>
            <span>— معلومات نشته</span>
          </div>
          <div
            className="max-w-full overflow-x-auto rounded-xl border bg-card shadow-sm"
            role="region"
            tabIndex={0}
            aria-label="د آرشیف د ورځنیو شمېرنو پرتله"
          >
            <table className="w-full min-w-[900px] table-fixed border-collapse text-center text-[10px] leading-tight">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-[180px] border border-border bg-muted p-2 text-right"
                  >
                    د پرتله ډول
                  </th>
                  {days.map((day) => (
                    <th scope="col" key={day} className="border border-border bg-muted px-0 py-2">
                      {fmt(day)}
                    </th>
                  ))}
                  {["د کارمند مجموعه", "د آرشیف مجموعه", "د مجموعې توپیر", "د توپیر ورځې"].map(
                    (label) => (
                      <th
                        scope="col"
                        key={label}
                        className="w-[82px] border border-border bg-secondary px-1 py-2"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(["ordinary", "service"] as const).map((metric, index) => {
                  const metricRows = rows.filter((row) => row.metric === metric);
                  const comparable = metricRows.filter(
                    (row) => row.status === "equal" || row.status === "mismatch",
                  );
                  const employeeTotal = sumComparable(metricRows, "employee");
                  const archiveTotal = sumComparable(metricRows, "archive");
                  const differenceDays = metricRows.filter(
                    (row) => row.status === "mismatch",
                  ).length;
                  return (
                    <tr key={metric} className={index % 2 ? "bg-muted/20" : "bg-card"}>
                      <th scope="row" className="border border-border p-2 text-right font-semibold">
                        {metricLabels[metric]}
                      </th>
                      {days.map((day) => {
                        const row = visibleRows.get(`${metric}:${day}`);
                        const status = row?.status ?? "missing";
                        const text =
                          status === "equal"
                            ? "✓"
                            : status === "mismatch"
                              ? fmt(row?.delta ?? null)
                              : status === "holiday"
                                ? "ج"
                                : "—";
                        return (
                          <td key={day} className="border border-border p-0">
                            <button
                              type="button"
                              disabled={!row}
                              onClick={() => row && setSelected(row)}
                              title={`${metricLabels[metric]} — ${day} ${JALALI_MONTHS[month - 1]}: ${status === "mismatch" ? `توپیر ${fmt(row?.delta ?? null)}` : status === "equal" ? "برابر" : status === "holiday" ? "جمعه ـ رخصتي" : "معلومات نشته"}`}
                              aria-label={`${metricLabels[metric]}، ${day} ${JALALI_MONTHS[month - 1]}، ${status === "mismatch" ? `توپیر ${fmt(row?.delta ?? null)}` : status === "equal" ? "برابر" : status === "holiday" ? "جمعه ـ رخصتي" : "معلومات نشته"}`}
                              className={`min-h-8 w-full px-0 font-medium tabular-nums transition-colors hover:border-primary/40 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${status === "mismatch" ? "bg-destructive/10 text-destructive" : status === "equal" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                            >
                              {text}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border border-border p-1 font-semibold">
                        {comparable.length ? fmt(employeeTotal) : "—"}
                      </td>
                      <td className="border border-border p-1 font-semibold">
                        {comparable.length ? fmt(archiveTotal) : "—"}
                      </td>
                      <td
                        className={`border border-border p-1 font-semibold ${employeeTotal !== archiveTotal ? "text-destructive" : ""}`}
                      >
                        {comparable.length ? fmt(employeeTotal - archiveTotal) : "—"}
                      </td>
                      <td className="border border-border p-1 font-semibold text-destructive">
                        {fmt(differenceDays)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-bold">
                  <th scope="row" className="border border-border p-2 text-right">
                    د ورځنیو توپیرونو شمېر
                  </th>
                  {days.map((day) => (
                    <td key={day} className="border border-border p-1">
                      {fmt(
                        rows.filter((row) => row.day === day && row.status === "mismatch").length,
                      )}
                    </td>
                  ))}
                  <td
                    colSpan={3}
                    className="border border-border p-2 text-xs text-muted-foreground"
                  >
                    مجموعې یوازې د دواړو سرچینو له پرتله کېدونکو ورځو څخه
                  </td>
                  <td className="border border-border p-1 text-destructive">
                    {fmt(mismatchCount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            تشې شمېرې صفر نه ګڼل کېږي؛ د مجموعو محاسبه یوازې د هغو ورځو لپاره ده چې د کارکوونکو او
            آرشیف دواړو شمېرې پکې شته.
          </p>
        </>
      )}
      {selectedRow && (
        <div className="rounded-lg border p-4" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-2">
            <strong>
              {metricLabels[selectedRow.metric]} — {fmt(selectedRow.day)} {JALALI_MONTHS[month - 1]}
            </strong>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              بندول
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 text-center text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">د کارکوونکو راپور</p>
              <strong>{fmt(selectedRow.employee)}</strong>
              {selectedRow.employeeUrl && (
                <a
                  className="block text-xs text-primary underline"
                  href={selectedRow.employeeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  سرچینه پرانیزئ
                </a>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">آرشیف</p>
              <strong>{fmt(selectedRow.archive)}</strong>
              {selectedRow.archiveUrl && (
                <a
                  className="block text-xs text-primary underline"
                  href={selectedRow.archiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  سرچینه پرانیزئ
                </a>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">توپیر</p>
              <strong className={selectedRow.status === "mismatch" ? "text-destructive" : ""}>
                {fmt(selectedRow.delta)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
