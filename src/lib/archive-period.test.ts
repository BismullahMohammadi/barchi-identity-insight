import { describe, expect, it } from "vitest";
import { ARCHIVE_PERIOD_OPTIONS, archivePeriodRange, archivePeriodCaption } from "./archive-period";
import { filterByDate, normalizeGrid, sumColumn } from "./normalize";

const now = new Date("2026-10-28T06:00:00Z"); // Wednesday, Kabul, 1405/08/06
const sheet = [
 ["د آرشیف سکن شوي دوسیې او کنترول"],[],
 ["","سکن شوي ورقې","","","کنترول شوي ورقې"],
 ["نیټه","کریمي","تابش","مجموعه","علیزاده","افشار","مجموعه","نا کنترول شوي"],
 ["۱۴۰۵/۰۷/۲۵","10","12","22","5","7","12","10"],
 ["۱۴۰۵/۰۸/۰۱","15","15","30","11","9","20","10"],
 ["۱۴۰۵/۰۸/۰۲","4","6","10","5","2","7","3"],
 ["۱۴۰۵/۰۸/۰۵","7","8","15","7","7","14","1"],
 ["۱۴۰۵/۰۸/۰۶","9","11","20","10","8","18","2"],
];
describe("archive scanning Kabul relative period filters",()=>{
 it("uses Kabul civil yesterday even when the client timezone is different",()=>{
  expect(archivePeriodRange("today",now)).toEqual({from:{y:1405,m:8,d:6},to:{y:1405,m:8,d:6}});
  expect(archivePeriodRange("yesterday",now)).toEqual({from:{y:1405,m:8,d:5},to:{y:1405,m:8,d:5}});
 });
 it("respects Afghanistan Saturday-Friday work weeks including month crossover",()=>{
  expect(archivePeriodRange("thisWeek",now)).toEqual({from:{y:1405,m:8,d:2},to:{y:1405,m:8,d:6}});
  expect(archivePeriodRange("lastWeek",now)).toEqual({from:{y:1405,m:7,d:25},to:{y:1405,m:8,d:1}});
 });
 it("keeps the prior full Jalali month and all-data selection",()=>{
  expect(archivePeriodRange("thisMonth",now)).toEqual({from:{y:1405,m:8,d:1},to:{y:1405,m:8,d:6}});
  expect(archivePeriodRange("lastMonth",now)).toEqual({from:{y:1405,m:7,d:1},to:{y:1405,m:7,d:30}});
  expect(archivePeriodRange("all",now)).toEqual({from:null,to:null});
  expect(archivePeriodCaption(archivePeriodRange("yesterday",now))).toBe("1405/08/05");
  expect(ARCHIVE_PERIOD_OPTIONS).toHaveLength(7);
 });
 it("applies the selected week to archive scan, control and staff totals",()=>{
  const table=normalizeGrid(sheet,"د آرشیف دوسیو سکن");
  const lastWeek=filterByDate(table,archivePeriodRange("lastWeek",now)).rows;
  const thisWeek=filterByDate(table,archivePeriodRange("thisWeek",now)).rows;
  const yesterday=filterByDate(table,archivePeriodRange("yesterday",now)).rows;
  expect(sumColumn(lastWeek,3)).toBe(52);
  expect(sumColumn(lastWeek,6)).toBe(32);
  expect(sumColumn(thisWeek,3)).toBe(45);
  expect(sumColumn(thisWeek,7)).toBe(6);
  expect(sumColumn(thisWeek,1)).toBe(20);
  expect(sumColumn(yesterday,3)).toBe(15);
 });
 it("crosses a Jalali year boundary correctly",()=>{
  const day=new Date("2026-03-22T06:00:00Z"); // 1405/01/02
  expect(archivePeriodRange("lastMonth",day)).toEqual({from:{y:1404,m:12,d:1},to:{y:1404,m:12,d:30}});
 });
});
