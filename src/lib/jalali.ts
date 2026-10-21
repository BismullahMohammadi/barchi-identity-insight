export const JALALI_MONTHS = ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدي", "دلو", "حوت"];
const DIGITS: Record<string,string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
export function toLatinDigits(s: string): string { return s.replace(/[۰-۹٠-٩]/g, d => DIGITS[d] ?? d); }
export type JDate = { y: number; m: number; d: number };
/** Parse YYYY/MM/DD with Afghan Persian/Pashto digits and validate calendar days. */
export function parseJalali(raw: string): JDate | null {
  const match = toLatinDigits(String(raw ?? "")).trim().match(/^(1[34]\d\d)[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > (m <= 6 ? 31 : m <= 11 ? 30 : 30)) return null;
  return { y, m, d };
}
export function jKey(j: JDate): number { return j.y * 10000 + j.m * 100 + j.d; }
export function formatJ(j: JDate): string { return `${j.y}/${String(j.m).padStart(2,"0")}/${String(j.d).padStart(2,"0")}`; }
function localJalali(date: Date): JDate {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {timeZone:"Asia/Kabul",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(date);
  const get = (type: string) => Number(parts.find(p=>p.type===type)?.value);
  return {y:get("year"),m:get("month"),d:get("day")};
}
export function todayJalali(): JDate { return localJalali(new Date()); }
export function nowJalaliTime(ts: number): string {
  const date = new Date(ts);
  const time = new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(date);
  return `${formatJ(localJalali(date))} ${time}`;
}
