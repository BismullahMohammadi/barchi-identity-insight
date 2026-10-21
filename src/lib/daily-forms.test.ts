import { describe, expect, it } from "vitest";
import { parseNamedJalaliTab, selectDailyTab } from "./daily-forms";
describe("daily introduced forms tab resolution",()=>{
 it("parses explicit Mizan 1405 dates",()=>{
   expect(parseNamedJalaliTab("29 میزان 1405")).toEqual({y:1405,m:7,d:29});
   expect(parseNamedJalaliTab("11 - میزان 1405")).toEqual({y:1405,m:7,d:11});
 });
 it("selects today's tab and ignores newer tabs",()=>{
   expect(selectDailyTab(["28 میزان 1405","29 میزان 1405","30 میزان 1405"],{y:1405,m:7,d:29})?.name).toBe("29 میزان 1405");
 });
 it("uses the latest prior day when today does not exist",()=>{
   expect(selectDailyTab(["20 میزان 1405","23 میزان 1405","جدول جمع اوری ماه میزان 1405"],{y:1405,m:7,d:25})?.name).toBe("23 میزان 1405");
 });
 it("rejects unrelated templates",()=>{
   expect(parseNamedJalaliTab("مجموعه")).toBeNull();
   expect(parseNamedJalaliTab("جدول جمع اوری ماه میزان 1405")).toBeNull();
 });
});