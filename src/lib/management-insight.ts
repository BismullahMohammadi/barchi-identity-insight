import { formatJ, jKey, type JDate } from "./jalali";
import { isTotalRow, type NormalizedTable } from "./normalize";

export type ActivitySignal = { lastDate: string; lastCount: number; changePercent: number | null; message: string | null };
/** Conservative, local rule-based insight; no personal data or external AI service. */
export function latestActivitySignal(table: NormalizedTable, metricIndex: number): ActivitySignal | null {
  const days = new Map<number, { date: JDate; count: number }>();
  table.rows.forEach((row, i) => {
    const date = table.dates[i];
    const count = row[metricIndex];
    if (!date || typeof count !== "number" || isTotalRow(row)) return;
    const key = jKey(date);
    const prev = days.get(key);
    days.set(key, { date, count: (prev?.count ?? 0) + count });
  });
  const sorted = [...days.values()].sort((a,b) => jKey(b.date) - jKey(a.date));
  if (!sorted.length) return null;
  const latest = sorted[0];
  const prior = sorted[1];
  let changePercent: number | null = null;
  let message: string | null = null;
  if (prior && prior.count > 0) {
    changePercent = Math.round((latest.count - prior.count) * 100 / prior.count);
    if (changePercent <= -20) message = "د پاس شويو تذکرو شمېر د مخکیني ثبت شوي راپور په پرتله کم شوی؛ د علت ارزونه وکړئ.";
    if (changePercent >= 20) message = "د پاس شويو تذکرو شمېر د مخکیني ثبت شوي راپور په پرتله لوړ شوی.";
  }
  return { lastDate: formatJ(latest.date), lastCount: latest.count, changePercent, message };
}
