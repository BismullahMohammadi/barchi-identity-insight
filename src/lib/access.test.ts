import { describe, expect, it } from "vitest";
import { isEmailAllowed } from "./access";
import { parseJalali } from "./jalali";
import { filterByDate, normalizeGrid } from "./normalize";

describe("owner allowlist", () => {
  it("denies everyone when the list is empty", () => {
    expect(isEmailAllowed("owner@gmail.com", "")).toBe(false);
    expect(isEmailAllowed("owner@gmail.com", undefined)).toBe(false);
  });
  it("allows only listed emails, case-insensitive", () => {
    expect(isEmailAllowed("Owner@Gmail.com", "owner@gmail.com, b@x.af")).toBe(true);
    expect(isEmailAllowed("other@gmail.com", "owner@gmail.com")).toBe(false);
  });
  it("denies missing email", () => {
    expect(isEmailAllowed(null, "owner@gmail.com")).toBe(false);
  });
});

describe("jalali filtering", () => {
  it("parses Persian digits", () => {
    expect(parseJalali("۱۴۰۵/۰۲/۱۰")).toEqual({ y: 1405, m: 2, d: 10 });
  });
  it("keeps only rows inside the range", () => {
    const t = normalizeGrid([["نیټه", "شمېر"], ["1405/01/05", "3"], ["1405/02/05", "4"]]);
    const r = filterByDate(t, { from: { y: 1405, m: 2, d: 1 }, to: { y: 1405, m: 2, d: 31 } });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.[1]).toBe(4);
  });
});

describe("real spreadsheet column mappings", () => {
  it("reads overall passed cases from D, not tariff B", () => {
    const grid = [["سرلیک"], [], [], ["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],["۱۴۰۵/۰۱/۰۳","64","AFN 32,000","65","-500","71","AFN 0","AFN 15,000"]];
    const t = normalizeGrid(grid, "مجموعی راپور");
    expect(t.headers[3]).toBe("پاس شوي");
    expect(t.rows[0]?.[3]).toBe(65);
    expect(t.rows[0]?.[2]).toBe(32000);
    expect(t.numericCols).toContain(3);
  });
  it("does not add bank subtotals and final total together", () => {
    const grid=[["سرلیک"],[],[],["نېټه","جدید او ثبت تولد","مثنی","تجدید","مثنی او تجدید","انفرادی تعداد","مجموعه"],["۱۴۰۵/۰۱/۰۳","32000","15000","0","15000","64","47000"]];
    const t=normalizeGrid(grid,"بانکي عواید");
    expect(t.rows[0]?.[6]).toBe(47000);
    expect(t.rows[0]?.[6]).toBe(47000); // final total is independent of its subtotals
  });
  it("preserves transposed directorate report without summing days as KPIs", () => {
    const t=normalizeGrid([["بخشونه","1","2","جمله"],["چک اسناد","96","72","168"],["عواید","؋ 31,000","؋ 23,500","؋ 54,500"]],"ریاست ته ګزارش");
    expect(t.dateCol).toBe(-1);
    expect(t.numericCols).toEqual([1]); // per-service final totals after transposition
    expect(t.rows.length).toBe(2);
  });
});
