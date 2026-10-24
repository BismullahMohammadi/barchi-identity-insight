import { filterByDate, isTotalRow, sumColumn, type NormalizedTable } from "./normalize";
import { jKey, type JDate } from "./jalali";

export type OverviewPeriod = "all" | "month" | "previousMonth" | "today" | "yesterday";
export function periodRange(period: OverviewPeriod, today: JDate, yesterday?: JDate) {
  if (period === "all") return { from: null, to: null };
  if (period === "month") return { from: { y: today.y, m: today.m, d: 1 }, to: today };
  if (period === "previousMonth") {
    const y = today.m === 1 ? today.y - 1 : today.y;
    const m = today.m === 1 ? 12 : today.m - 1;
    return {from:{y,m,d:1},to:{y,m,d:m<=6?31:m<=11?30:30}};
  }
  if (period === "yesterday") return {from:yesterday??today,to:yesterday??today};
  return { from: today, to: today };
}
export function periodRows(table: NormalizedTable, period: OverviewPeriod, today: JDate, yesterday?: JDate) {
  const { rows } = filterByDate(table, periodRange(period, today, yesterday));
  return rows.filter(r => !isTotalRow(r));
}
export function previousDayChange(table: NormalizedTable, column: number, today: JDate, yesterday: JDate): number | null {
  const todayRows = table.rows.filter((r, i) => table.dates[i] && jKey(table.dates[i]!) === jKey(today) && !isTotalRow(r));
  const yesterdayRows = table.rows.filter((r, i) => table.dates[i] && jKey(table.dates[i]!) === jKey(yesterday) && !isTotalRow(r));
  if (!todayRows.length || !yesterdayRows.length) return null;
  const current = sumColumn(todayRows, column);
  const prior = sumColumn(yesterdayRows, column);
  if (prior === 0) return null;
  return Math.round((current - prior) / prior * 100);
}
