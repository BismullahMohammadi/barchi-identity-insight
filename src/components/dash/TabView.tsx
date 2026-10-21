import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JALALI_MONTHS, formatJ, parseJalali } from "@/lib/jalali";
import { filterByDate, isTotalRow, normalizeGrid, sumColumn, toCsv, type Cell } from "@/lib/normalize";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 2 });

export function TabView({ title, grid }: { title: string; grid: string[][] }) {
  const table = useMemo(() => normalizeGrid(grid), [grid]);
  const [month, setMonth] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(() => {
    if (month !== "all") {
      const m = +month;
      return { from: { y: 1405, m, d: 1 }, to: { y: 1405, m, d: 31 } };
    }
    return { from: parseJalali(from), to: parseJalali(to) };
  }, [month, from, to]);

  const { rows, dates } = useMemo(() => filterByDate(table, range), [table, range]);
  const metricCols = table.numericCols.slice(0, 5);

  const chartData = useMemo(
    () =>
      rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !isTotalRow(r))
        .slice(0, 400)
        .map(({ r, i }) => {
          const o: Record<string, string | number> = {
            label: dates[i] ? formatJ(dates[i]!).slice(5) : String(r[table.labelCol] ?? ""),
          };
          metricCols.forEach((c) => { const key = table.headers[c]; if (key !== undefined) o[key] = typeof r[c] === "number" ? (r[c] as number) : 0; });
          return o;
        }),
    [rows, dates, metricCols, table],
  );

  function exportCsv() {
    const blob = new Blob([toCsv(table.headers, rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}-1405.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!grid.length) {
    return <p className="rounded-xl border bg-card p-6 text-muted-foreground">په دې پاڼه کې معلومات نشته.</p>;
  }

  const ChartEl = table.dateCol >= 0 ? LineChart : BarChart;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-card">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">میاشت (۱۴۰۵)</label>
          <Select value={month} onValueChange={setMonth} disabled={table.dateCol < 0}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ټول کال</SelectItem>
              {JALALI_MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">له نېټې</label>
          <Input dir="ltr" placeholder="1405/01/01" className="w-32" value={from} disabled={month !== "all" || table.dateCol < 0} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تر نېټې</label>
          <Input dir="ltr" placeholder="1405/12/29" className="w-32" value={to} disabled={month !== "all" || table.dateCol < 0} onChange={(e) => setTo(e.target.value)} />
        </div>
        {table.dateCol < 0 && <p className="text-xs text-muted-foreground">په دې پاڼه کې د نېټې ستون ونه موندل شو.</p>}
        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> PDF</Button>
        </div>
      </div>

      {metricCols.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {metricCols.map((c, i) => (
            <div key={c} className="rounded-xl border bg-card p-4 shadow-card">
              <p className="truncate text-xs text-muted-foreground" title={table.headers[c]}>{table.headers[c]}</p>
              <p className="mt-2 text-2xl font-extrabold" style={{ color: CHART_COLORS[i] }}>{fmt(sumColumn(rows, c))}</p>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 1 && metricCols.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ChartEl data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} reversed />
                <YAxis tick={{ fontSize: 11 }} orientation="right" />
                <Tooltip contentStyle={{ fontFamily: "Vazirmatn", direction: "rtl" }} />
                <Legend wrapperStyle={{ fontFamily: "Vazirmatn", fontSize: 12 }} />
                {metricCols.map((c, i) =>
                  table.dateCol >= 0 ? (
                    <Line key={c} type="monotone" dataKey={table.headers[c] ?? `ستون ${c + 1}`} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false} />
                  ) : (
                    <Bar key={c} dataKey={table.headers[c] ?? `ستون ${c + 1}`} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />
                  ),
                )}
              </ChartEl>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>{table.headers.map((h, i) => <TableHead key={i} className="whitespace-nowrap text-right">{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: Cell[], i) => (
                <TableRow key={i} className={isTotalRow(r) ? "bg-secondary font-bold" : ""}>
                  {r.map((c, j) => (
                    <TableCell key={j} className="whitespace-nowrap">{typeof c === "number" ? fmt(c) : c}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">{fmt(rows.length)} قطارونه</p>
      </div>
    </div>
  );
}
