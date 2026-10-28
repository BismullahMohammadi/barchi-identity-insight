import {describe,expect,it} from "vitest";
import {findReportMonth,inspectStaffDay} from "./monthly-staff-completeness";
const headers=[["شماره","فعالیت","تیم","اسم","ولد","وظیفه","نوعیت فعالیت",1,2,3,4,5]];
const rows=[
 [9,"روند عادی",1,"نېک ولي خان ایمان","کمال خان","کنترول کیفیت","تصدیق فامیلی",4,7,9,10,0],
 [10,null,null,null,null,null,"تصدیق انفرادی",21,16,16,28,0],
 [11,null,null,"رحمت الله مدبر","محمد حسن","ثبت نام","دیموگرافی",0,14,24,0,null],
 [12,null,null,null,null,null,"بایومتریک",40,0,0,1,null],
 [13,null,null,null,null,null,"ثبت فامیلی",0,7,9,2,null],
 [14,null,null,"محمد طاهر حسینی","ناصر","ثبت نام","دیموگرافی",0,0,0,24,24],
 [15,null,null,null,null,null,"بایومتریک",20,10,2,3,0],
];
describe("per-employee previous-day report monitoring",()=>{
 it("chooses the month by name instead of sheet index",()=>{
  expect(findReportMonth(["میاشتنۍ مجموعه","ګزارش ماه میزان","ګزارش ماه عقرب"],8)).toBe("ګزارش ماه عقرب");
  expect(findReportMonth(["ماه ثور","گزارش ماه ثور"],2)).toBe("گزارش ماه ثور");
  expect(findReportMonth(["میاشتنۍ مجموعه"],8)).toBeNull();
 });
 it("reports only the employee with entirely blank activity cells",()=>{
  const x=inspectStaffDay([...headers,...rows],{y:1405,m:8,d:5},"ګزارش ماه عقرب");
  expect(x.status).toBe("incomplete");
  expect(x.totalCount).toBe(3);
  expect(x.submittedCount).toBe(2);
  expect(x.missing.map(e=>e.name)).toEqual(["رحمت الله مدبر"]);
  expect(x.missing[0]?.activities).toEqual(["دیموگرافی","بایومتریک","ثبت فامیلی"]);
 });
 it("counts explicit zeros as a submitted report",()=>{
  const x=inspectStaffDay([...headers,...rows],{y:1405,m:8,d:1},"ګزارش ماه عقرب");
  expect(x.status).toBe("complete");
  expect(x.missing).toHaveLength(0);
 });
 it("reads the alternative row-four monthly header layout",()=>{
  const x=inspectStaffDay([["اداره"],["metadata"],["metadata"],...headers,...rows],{y:1405,m:8,d:5},"ګزارش ماه عقرب");
  expect(x.status).toBe("incomplete");
 });
 it("does not declare an empty or wrongly structured month complete",()=>{
  expect(inspectStaffDay([], {y:1405,m:8,d:5},"").status).toBe("unavailable");
  expect(inspectStaffDay([["random"]],{y:1405,m:8,d:5},"ګزارش ماه عقرب").status).toBe("unavailable");
 });
});
