import { TABS } from "@/lib/tabs";
import { useSectionActions } from "@/lib/dashboard-access-context";
import {useDashboardSettings} from "@/lib/dashboard-settings";
import {Link} from "@tanstack/react-router";
import {resolveMappedGrid} from "@/lib/sheet-mapping-preferences";
import { AnimatedNumber } from "@/components/dash/AnimatedNumber";
import { printSection } from "@/lib/print-section";
import { flushSync } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JALALI_MONTHS } from "@/lib/jalali";
import { holidayStatus, holidayLabel } from "@/lib/holidays";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";
import { filterByDate, isTotalRow, normalizeGrid, sumColumn, toCsv, type Cell, type DateFilter } from "@/lib/normalize";

const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 2 });

/**
 * Keep report pages actionable, not a second full Google Sheet.
 * Show the main verified metric first. Full rows/exports are optional.
 */
export function TabView({ title, grid, detailsOnly = false, selectedMonth, onSelectedMonthChange, dateRange }: { title: string; grid: string[][]; detailsOnly?: boolean; selectedMonth?: string; onSelectedMonthChange?: (month: string) => void; dateRange?: DateFilter | undefined }) {
  const can = useSectionActions(TABS.find(tab=>tab.title===title)?.slug ?? "");
  const settings=useDashboardSettings();
  const { table, mappingError } = useMemo(() => {
    try { return { table: normalizeGrid(resolveMappedGrid(grid,title), title), mappingError: null as string | null }; }
    catch (e) {
      return { table: normalizeGrid([]), mappingError: e instanceof Error ? e.message : "SHEET_MAPPING_MISMATCH" };
    }
  }, [grid, title]);
  const [internalMonth, setInternalMonth] = useState("all");
  const month = selectedMonth ?? internalMonth;
  const setMonth = onSelectedMonthChange ?? setInternalMonth;
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(20);
  const [expanded, setExpanded] = useState(false);

  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const prepare = () => flushSync(() => setPrinting(true));
    const restore = () => setPrinting(false);
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  const range = useMemo(() => dateRange ?? (month === "all"
    ? { from: null, to: null }
    : { from: { y: 1405, m: Number(month), d: 1 }, to: { y: 1405, m: Number(month), d: 31 } }),
  [month,dateRange]);
  const hasUndatedRange=!!dateRange&&table.dateCol<0;
  const { rows } = useMemo(() => hasUndatedRange?{rows:[],dates:[]}:filterByDate(table, range), [table, range,hasUndatedRange]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return q ? rows.filter(row => row.some(cell => String(cell ?? "").toLocaleLowerCase().includes(q))) : rows;
  }, [rows, search]);
  const primary = SHEET_COLUMNS[title]?.primaryCol ?? null;
  const canSum = primary !== null && table.numericCols.includes(primary);
  const validRows = rows.filter(row => !isTotalRow(row));
  const mainTotal = canSum && validRows.length > 0 ? sumColumn(validRows, primary) : null;
  const primaryLabel = canSum ? table.headers[primary] : null;
  const shownRows = printing ? filteredRows : filteredRows.slice(0, Math.max(shown,settings.tablePageSize));
  const subtotalRows=shownRows.filter(r=>!isTotalRow(r));
  const distributionTotals = title === "توزیع" && validRows.length ? {regular:sumColumn(validRows,1),services:sumColumn(validRows,2)} : null;

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
      د شیټ د کالمونو ستونزه: {mappingError}
      <Link to="/dashboard/$slug" params={{slug:"settings"}} className="mt-3 block w-fit rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">تنظیمات ← Google Sheets کې یې اصلاح کړئ</Link>
    </p>
  );
  if (!grid.length) return <p className="rounded-xl border bg-card p-5 text-muted-foreground">د دې راپور معلومات لا نه دي ترلاسه شوي.</p>;

  return (
    <div className="space-y-4">
      {hasUndatedRange&&<p role="status" className="rounded-lg border p-3 text-sm text-muted-foreground">راپور ورځنۍ نېټې نه لري، نو د ټاکلې مودې شمېرې نه شي محاسبه کېدای.</p>}
      {!detailsOnly && <section className="dashboard-panel flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{primaryLabel ?? "د راپور قطارونه"}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {mainTotal === null ? (canSum ? "—" : <AnimatedNumber value={validRows.length}/>) : <AnimatedNumber value={mainTotal} maximumFractionDigits={2}/>}
          </p>
        </div>
        {table.dateCol >= 0 && (
          <div className="space-y-1">
            <label htmlFor="report-month" className="text-xs text-muted-foreground">د راپور میاشت</label>
            <Select value={month} onValueChange={value => { setMonth(value); setShown(settings.tablePageSize); }}>
              <SelectTrigger id="report-month" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ټول کال</SelectItem>
                {JALALI_MONTHS.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>}

      {distributionTotals && <section className="grid grid-cols-2 gap-3" aria-label="عادي او خدماتي توزیع">
        <div className="dashboard-panel p-4 sm:p-5"><p className="text-xs font-semibold text-muted-foreground">عادي توزیع</p><p className="mt-2 text-2xl font-extrabold tabular-nums"><AnimatedNumber value={distributionTotals.regular} maximumFractionDigits={2}/></p><p className="mt-1 text-xs text-muted-foreground">د ټاکلې مودې تذکرې</p></div>
        <div className="dashboard-panel p-4 sm:p-5"><p className="text-xs font-semibold text-muted-foreground">د خدماتو توزیع</p><p className="mt-2 text-2xl font-extrabold tabular-nums"><AnimatedNumber value={distributionTotals.services} maximumFractionDigits={2}/></p><p className="mt-1 text-xs text-muted-foreground">د ټاکلې مودې تذکرې</p></div>
      </section>}

      <section data-print-section className="dashboard-panel overflow-hidden">
        <h2 className="hidden print:block">{TABS.find(tab=>tab.title===title)?.label ?? title}</h2>
        <button type="button" aria-expanded={expanded}
          className="no-print flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start text-sm font-semibold transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          onClick={() => setExpanded(v => !v)}>
          <span>تفصیلي معلومات {expanded ? "" : "(د اړتیا پر مهال)"}</span>
          <ChevronDown aria-hidden className={expanded ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
        </button>
        {(expanded || printing) && (
          <div className="space-y-3 border-t p-3">
            <div className="no-print flex flex-wrap items-center gap-2">
              <div className="relative min-w-40 flex-1 sm:max-w-xs">
                <Search aria-hidden className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input aria-label="په راپور کې پلټنه" placeholder="په جدول کې پلټنه" className="min-h-11 ps-9"
                  value={search} onChange={event => { setSearch(event.target.value); setShown(settings.tablePageSize); }} />
              </div>
              {can("export") && <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filteredRows.length}>
                <Download className="h-4 w-4" /> CSV
              </Button>}
              {can("print") && <Button size="sm" variant="outline" onClick={e => printSection(e.currentTarget)} disabled={!filteredRows.length}>
                <Printer className="h-4 w-4" /> چاپ
              </Button>}
            </div>
            <div className="max-h-[460px] w-full overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm">
                  <TableRow>{table.headers.map((name, i) => <TableHead key={i} className="min-w-24 whitespace-nowrap text-start font-semibold">{name}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {shownRows.map((row: Cell[], i) => (
                    <TableRow key={i} className={isTotalRow(row) ? "bg-secondary font-bold" : holidayStatus(row,table.dateCol) ? "bg-amber-500/10" : ""}>
                      {row.map((value, j) => <TableCell key={j} className="whitespace-nowrap text-sm">{typeof value === "number" ? fmt(value) : value ?? "—"}{j===table.dateCol&&holidayLabel(holidayStatus(row,table.dateCol))&&<span className="ms-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-800 dark:text-amber-300">{holidayLabel(holidayStatus(row,table.dateCol))}</span>}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
                {shownRows.length>0&&<tfoot className="sticky bottom-0 z-10 bg-secondary font-bold shadow-[0_-2px_6px_rgba(0,0,0,0.08)]">
                 <TableRow>{table.headers.map((_,i)=><TableCell key={i} className="whitespace-nowrap border-t-2 py-3 text-sm">
                  {i===table.labelCol?"د ښکاره قطارونو جمع":table.numericCols.includes(i)?fmt(sumColumn(subtotalRows,i)):""}
                 </TableCell>)}</TableRow>
                </tfoot>}
              </Table>
              {!shownRows.length && <p className="p-4 text-center text-sm text-muted-foreground">د دې انتخاب لپاره معلومات نشته.</p>}
            </div>
            <div className="no-print flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{fmt(shownRows.length)} له {fmt(filteredRows.length)} قطارونو</span>
              {shownRows.length < filteredRows.length && (
                <Button size="sm" variant="ghost" onClick={() => setShown(n => n + settings.tablePageSize)}>نور ښکاره کړئ</Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
