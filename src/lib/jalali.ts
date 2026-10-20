import { toJalaali } from "jalaali-js";

export const JALALI_MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدي", "دلو", "حوت",
];

const DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d);
}

export type JDate = { y: number; m: number; d: number };

/** Parse "1405/01/15", "1405-1-15", "۱۴۰۵/۱/۱۵". Returns null if not a Jalali date. */
export function parseJalali(raw: string): JDate | null {
  const s = toLatinDigits(String(raw ?? "")).trim();
  const m = s.match(/^(1[34]\d\d)[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function jKey(j: JDate): number {
  return j.y * 10000 + j.m * 100 + j.d;
}

export function formatJ(j: JDate): string {
  return `${j.y}/${String(j.m).padStart(2, "0")}/${String(j.d).padStart(2, "0")}`;
}

export function todayJalali(): JDate {
  const n = new Date();
  const j = toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  return { y: j.jy, m: j.jm, d: j.jd };
}

export function nowJalaliTime(ts: number): string {
  const n = new Date(ts);
  const j = toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  const hh = String(n.getHours()).padStart(2, "0");
  const mm = String(n.getMinutes()).padStart(2, "0");
  const ss = String(n.getSeconds()).padStart(2, "0");
  return `${formatJ({ y: j.jy, m: j.jm, d: j.jd })} ${hh}:${mm}:${ss}`;
}
