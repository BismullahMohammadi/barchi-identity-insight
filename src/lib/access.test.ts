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
