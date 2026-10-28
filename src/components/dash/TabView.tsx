import { useMemo, useState } from "react";
import { ChevronDown, Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JALALI_MONTHS } from "@/lib/jalali";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";
import { filterByDate, isTotalRow, normalizeGrid, sumColumn, toCsv, type Cell, type DateFilter } from "@/lib/normalize";

const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 2 });
const PAGE_SIZE = 20;

/**
 * Keep report pages actionable, not a second full Google Sheet.
 * Show the main verified metric first. Full rows/exports are optional.
 */
export function TabView({ title, grid, detailsOnly = false, selectedMonth, onSelectedMonthChange, dateRange }: { title: string; grid: string[][]; detailsOnly?: boolean; selectedMonth?: string; onSelectedMonthChange?: (month: string) => void; dateRange?: DateFilter | undefined }) {
  const { table, mappingError } = useMemo(() => {
    try { return { table: normalizeGrid(grid, title), mappingError: null as string | null }; }
    catch (e) {
      return { table: normalizeGrid([]), mappingError: e instanceof Error ? e.message : "SHEET_MAPPING_MISMATCH" };
    }
  }, [grid, title]);
  const [internalMonth, setInternalMonth] = useState("all");
  const month = selectedMonth ?? internalMonth;
  const setMonth = onSelectedMonthChange ?? setInternalMonth;
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState(false);

  const range = useMemo(() => dateRange ?? (month === "all"
    ? { from: null, to: null }
    : { from: { y: 1405, m: Number(month), d: 1 }, to: { y: 1405, m: Number(month), d: 31 } }),
  [month,dateRange]);
  const { rows } = useMemo(() => filterByDate(table, range), [table, range]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return q ? rows.filter(row => row.some(cell => String(cell ?? "").toLocaleLowerCase().includes(q))) : rows;
  }, [rows, search]);
  const primary = SHEET_COLUMNS[title]?.primaryCol ?? null;
  const canSum = primary !== null && table.numericCols.includes(primary);
  const validRows = rows.filter(row => !isTotalRow(row));
  const mainTotal = canSum && validRows.length > 0 ? sumColumn(validRows, primary) : null;
  const primaryLabel = canSum ? table.headers[primary] : null;
  const shownRows = filteredRows.slice(0, shown);

  function exportCsv() {
    const blob = new Blob([toCsv(table.headers, filteredRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = title + "-1405.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (mappingError) return (
    <p role="alert" className="rounded-xl border border-destructive/50 bg-card p-5 text-sm text-destructive">
      د شیټ د کالمونو جوړښت بدل شوی دی. د ناسمو شمېرو د مخنیوي لپاره راپور نه ښکاري: {mappingError}
    </p>
  );
  if (!grid.length) return <p className="rounded-xl border bg-card p-5 text-muted-foreground">د دې راپور معلومات لا نه دي ترلاسه شوي.</p>;

  return (
    <div className="space-y-4">
      {!detailsOnly && <section className="dashboard-panel flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{primaryLabel ?? "د راپور قطارونه"}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {mainTotal === null ? (canSum ? "—" : fmt(validRows.length)) : fmt(mainTotal)}
          </p>
        </div>
        {table.dateCol >= 0 && (
          <div className="space-y-1">
            <label htmlFor="report-month" className="text-xs text-muted-foreground">د راپور میاشت</label>
            <Select value={month} onValueChange={value => { setMonth(value); setShown(PAGE_SIZE); }}>
              <SelectTrigger id="report-month" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ټول کال</SelectItem>
                {JALALI_MONTHS.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>}

      <section className="dashboard-panel overflow-hidden">
        <button type="button" aria-expanded={expanded}
          className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start text-sm font-semibold transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          onClick={() => setExpanded(v => !v)}>
          <span>تفصیلي معلومات {expanded ? "" : "(د اړتیا پر مهال)"}</span>
          <ChevronDown aria-hidden className={expanded ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
        </button>
        {expanded && (
          <div className="space-y-3 border-t p-3">
            <div className="no-print flex flex-wrap items-center gap-2">
              <div className="relative min-w-40 flex-1 sm:max-w-xs">
                <Search aria-hidden className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input aria-label="په راپور کې پلټنه" placeholder="په جدول کې پلټنه" className="min-h-11 ps-9"
                  value={search} onChange={event => { setSearch(event.target.value); setShown(PAGE_SIZE); }} />
              </div>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filteredRows.length}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!filteredRows.length}>
                <Printer className="h-4 w-4" /> چاپ
              </Button>
            </div>
            <div className="max-h-[460px] w-full overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>{table.headers.map((name, i) => <TableHead key={i} className="min-w-24 whitespace-nowrap text-start font-semibold">{name}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {shownRows.map((row: Cell[], i) => (
                    <TableRow key={i} className={isTotalRow(row) ? "bg-secondary font-bold" : ""}>
                      {row.map((value, j) => <TableCell key={j} className="whitespace-nowrap text-sm">{typeof value === "number" ? fmt(value) : value ?? "—"}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!shownRows.length && <p className="p-4 text-center text-sm text-muted-foreground">د دې انتخاب لپاره معلومات نشته.</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{fmt(shownRows.length)} له {fmt(filteredRows.length)} قطارونو</span>
              {shownRows.length < filteredRows.length && (
                <Button size="sm" variant="ghost" onClick={() => setShown(n => n + PAGE_SIZE)}>نور ښکاره کړئ</Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
