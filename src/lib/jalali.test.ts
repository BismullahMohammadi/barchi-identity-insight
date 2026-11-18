import { expect, it } from "vitest";
import { parseJalali, yesterdayJalali } from "./jalali";

it("accepts Hoot 30 only in a leap year", () => {
  expect(parseJalali("۱۴۰۳/۱۲/۳۰")).toEqual({ y: 1403, m: 12, d: 30 });
  expect(parseJalali("۱۴۰۴/۱۲/۳۰")).toBeNull();
});

it("uses Kabul midnight for the previous reporting day", () => {
  expect(yesterdayJalali(Date.parse("2025-03-20T19:29:59Z"))).toEqual({ y: 1403, m: 12, d: 29 });
  expect(yesterdayJalali(Date.parse("2025-03-20T19:30:00Z"))).toEqual({ y: 1403, m: 12, d: 30 });
});
