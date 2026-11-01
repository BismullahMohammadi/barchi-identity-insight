// Pure generator diesel model. The baseline is a user-confirmed historical physical
// stock checkpoint — NOT the current stock. Everything after it is an estimate.
import { formatJ, type JDate } from "./jalali";

export const GENERATOR_BASELINE = {
  jalali: "1405/06/31",
  gregorian: "2026-09-22",
  /** Start of the baseline day in Kabul (UTC+4:30, no DST). */
  at: "2026-09-21T19:30:00.000Z",
  liters: 497,
  meterHours: 5113,
  rateLph: 3.5,
} as const;

export type MeterReading = { id: string; reading_at: string; meter_hours: number; rate_lph: number; measured_liters: number | null; note: string | null; created_at: string };
export type VerifiedDelivery = { id: string; delivered_at: string; liters: number; reference_no: string; supplier: string | null; note: string | null; created_at: string };

export type IntervalRow = MeterReading & {
  deltaHours: number;
  modeledLiters: number;
  deliveredInInterval: number;
  estimatedBalance: number;
  /** measured − estimated; null when no physical measurement was taken. */
  discrepancy: number | null;
};

export type ModelResult = {
  rows: IntervalRow[];
  totalHours: number;
  totalModeled: number;
  totalDelivered: number;
  estimatedBalance: number | null;
  lastReadingAt: string | null;
  lastMeasured: IntervalRow | null;
  pendingDeliveries: VerifiedDelivery[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Estimated balance = 497 + confirmed post-baseline deliveries − Σ(Δhours × rate of each interval).
 * Each reading's rate applies to the interval ending at that reading, so future rate changes are supported.
 * Returns estimatedBalance=null when there is no reading after the baseline (current stock unknown).
 */
export function computeModel(readingsIn: MeterReading[], deliveriesIn: VerifiedDelivery[]): ModelResult {
  const readings = [...readingsIn].sort((a, b) => a.reading_at.localeCompare(b.reading_at));
  const deliveries = [...deliveriesIn].filter(d => d.delivered_at > GENERATOR_BASELINE.at).sort((a, b) => a.delivered_at.localeCompare(b.delivered_at));
  let prevHours: number = GENERATOR_BASELINE.meterHours;
  let prevAt: string = GENERATOR_BASELINE.at;
  let modeled = 0, delivered = 0;
  const rows: IntervalRow[] = readings.map(r => {
    const deltaHours = Math.max(0, r.meter_hours - prevHours);
    const modeledLiters = r2(deltaHours * r.rate_lph);
    const inInterval = deliveries.filter(d => d.delivered_at > prevAt && d.delivered_at <= r.reading_at).reduce((s, d) => s + d.liters, 0);
    modeled += modeledLiters; delivered += inInterval;
    const estimatedBalance = r2(GENERATOR_BASELINE.liters + delivered - modeled);
    prevHours = r.meter_hours; prevAt = r.reading_at;
    return { ...r, deltaHours: r2(deltaHours), modeledLiters, deliveredInInterval: r2(inInterval), estimatedBalance,
      discrepancy: r.measured_liters == null ? null : r2(r.measured_liters - estimatedBalance) };
  });
  const pendingDeliveries = deliveries.filter(d => d.delivered_at > prevAt);
  const last = rows[rows.length - 1];
  const measured = rows.filter(x => x.measured_liters != null);
  return {
    rows, totalHours: r2(prevHours - GENERATOR_BASELINE.meterHours), totalModeled: r2(modeled), totalDelivered: r2(delivered),
    estimatedBalance: last ? last.estimatedBalance : null, lastReadingAt: last?.reading_at ?? null,
    lastMeasured: measured[measured.length - 1] ?? null, pendingDeliveries,
  };
}

/** Client-side mirror of the database rule: after baseline, after last reading, meter never decreases. */
export function validateReading(next: { reading_at: string; meter_hours: number; rate_lph: number; measured_liters: number | null }, existing: MeterReading[], now = Date.now()): string | null {
  if (!Number.isFinite(next.meter_hours) || next.meter_hours < GENERATOR_BASELINE.meterHours) return "METER_BELOW_BASELINE";
  if (!Number.isFinite(next.rate_lph) || next.rate_lph <= 0 || next.rate_lph > 100) return "INVALID_RATE";
  if (next.measured_liters != null && (!Number.isFinite(next.measured_liters) || next.measured_liters < 0 || next.measured_liters > 100000)) return "INVALID_MEASURED";
  const t = Date.parse(next.reading_at);
  if (!Number.isFinite(t)) return "INVALID_DATE";
  if (t <= Date.parse(GENERATOR_BASELINE.at)) return "READING_BEFORE_BASELINE";
  if (t > now + 10 * 60_000) return "READING_IN_FUTURE";
  const last = [...existing].sort((a, b) => a.reading_at.localeCompare(b.reading_at)).at(-1);
  if (last) {
    if (t <= Date.parse(last.reading_at)) return "READING_NOT_CHRONOLOGICAL";
    if (next.meter_hours < last.meter_hours) return "METER_NOT_MONOTONIC";
  }
  return null;
}

// ---- Afghan Jalali <-> Gregorian (Kabul time, UTC+4:30) ----
const KABUL_OFFSET_MIN = 270;
function jalaliOfUtcDay(ms: number): JDate {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}
/** Jalali calendar date -> Gregorian ISO date (YYYY-MM-DD). */
export function jalaliToGregorian(j: JDate): string | null {
  // Approximate, then walk to the exact day using the browser/runtime Persian calendar.
  const nowruz = Date.UTC(j.y + 621, 2, 21);
  const dayOfYear = (j.m <= 6 ? (j.m - 1) * 31 : 186 + (j.m - 7) * 30) + j.d - 1;
  const target = j.y * 10000 + j.m * 100 + j.d;
  let ms = nowruz + dayOfYear * 86400000;
  for (let i = 0; i < 6; i++) {
    const c = jalaliOfUtcDay(ms); const k = c.y * 10000 + c.m * 100 + c.d;
    if (k === target) return new Date(ms).toISOString().slice(0, 10);
    ms += (k < target ? 1 : -1) * 86400000;
  }
  return null;
}
/** Kabul-local Jalali date + HH:MM -> UTC ISO timestamp. */
export function kabulJalaliToIso(j: JDate, hhmm: string): string | null {
  const g = jalaliToGregorian(j); const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!g || !m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  const [y, mo, d] = g.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - KABUL_OFFSET_MIN * 60000).toISOString();
}
/** UTC ISO timestamp -> "1405/07/02 14:30" in Kabul. */
export function isoToKabulJalali(iso: string): string {
  const shifted = Date.parse(iso) + KABUL_OFFSET_MIN * 60000;
  const t = new Date(shifted).toISOString().slice(11, 16);
  return `${formatJ(jalaliOfUtcDay(shifted))} ${t}`;
}
