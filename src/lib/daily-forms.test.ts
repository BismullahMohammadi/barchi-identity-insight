import { describe, expect, it } from "vitest";
import { parseNamedJalaliTab, parseCoordinationTabDate, selectDailyTab, selectTodayDailyTab, selectTodayCoordinationTab } from "./daily-forms";
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
 it("does not use yesterday for today's registration visitors",()=>{
   expect(selectTodayDailyTab(["23 میزان 1405"],{y:1405,m:7,d:24})).toBeNull();
   expect(selectTodayDailyTab(["23 میزان 1405","24 میزان 1405"],{y:1405,m:7,d:24})?.name).toBe("24 میزان 1405");
 });
 it("rejects unrelated templates",()=>{
   expect(parseNamedJalaliTab("مجموعه")).toBeNull();
   expect(parseNamedJalaliTab("جدول جمع اوری ماه میزان 1405")).toBeNull();
 });
});
describe("coordination tab names as typed in the real workbook",()=>{
 const y=1405;
 it("accepts real variants",()=>{
  expect(parseCoordinationTabDate("13 عفرب 1405",y)).toEqual({y:1405,m:8,d:13});
  expect(parseCoordinationTabDate("5سنبله 1405",y)).toEqual({y:1405,m:6,d:5});
  expect(parseCoordinationTabDate("19 اسد",y)).toEqual({y:1405,m:5,d:19});
  expect(parseCoordinationTabDate(" 17 جوزا",y)).toEqual({y:1405,m:3,d:17});
  expect(parseCoordinationTabDate("12 حمل  1405",y)).toEqual({y:1405,m:1,d:12});
  expect(parseCoordinationTabDate("اول میزان 1405",y)).toEqual({y:1405,m:7,d:1});
  expect(parseCoordinationTabDate("۱۳ عقرب ۱۴۰۵",y)).toEqual({y:1405,m:8,d:13});
 });
 it("keeps the written year instead of forcing 1405",()=>{
  expect(parseCoordinationTabDate("5 حمل 1404",y)).toEqual({y:1404,m:1,d:5});
  expect(parseCoordinationTabDate("3 حمل 1406",1406)).toEqual({y:1406,m:1,d:3});
 });
 it("rejects templates and unrelated tabs",()=>{
  for(const t of ["نمونه جدول هماهنگی 1405","نمونه جدول هماهنگی ","Sheet2","Sheet3"])expect(parseCoordinationTabDate(t,y)).toBeNull();
 });
 it("selects only today's tab and exposes the latest earlier one",()=>{
  const names=["12 عقرب 1405","13 عفرب 1405","5 حمل 1404"];
  expect(selectTodayCoordinationTab(names,{y:1405,m:8,d:13}).today?.name).toBe("13 عفرب 1405");
  const tomorrow=selectTodayCoordinationTab(names,{y:1405,m:8,d:14});
  expect(tomorrow.today).toBeNull();
  expect(tomorrow.latest?.name).toBe("13 عفرب 1405");
 });
 it("1404 tab of the same day is not today in 1405",()=>{
  expect(selectTodayCoordinationTab(["5 حمل 1404"],{y:1405,m:1,d:5}).today).toBeNull();
 });
 it("intake parser stays strict (unchanged behavior)",()=>{
  expect(parseNamedJalaliTab("13 عفرب 1405")).toBeNull();
 });
});
