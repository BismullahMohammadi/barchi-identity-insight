import {describe,it,expect} from "vitest";
import {weeklyActivity,weeklyChange} from "./weekly-trend";
const headers=[["د سیستم په واسطه د پاس شويو دوسیو هفته وار راپور"],[],["له نېټې","تر نېټې","هفته","جدید او ثبت تولد","عواید","مثنی","تجدید"]];
describe("source-backed weekly trend",()=>{
 it("combines passed, duplicate and renewal but not AFN",()=>{
  const points=weeklyActivity([...headers,["1405/1/1","1405/1/6","1","423","AFN211,500","23","27"],["1405/1/8","1405/1/13","2","1090","AFN545,000","51","49"]]);
  expect(points.map(p=>p.total)).toEqual([473,1190]);
  expect(points[0]?.from).toBe("1405/01/01");
  expect(weeklyChange(points)).toBe(152);
 });
 it("ignores incomplete and duplicate weeks rather than fabricating values",()=>{
  const points=weeklyActivity([...headers,["1405/1/1","1405/1/6","1","423","AFN211,500","23","27"],["1405/1/8","1405/1/13","2","1090","AFN545,000","","49"],["1405/1/1","1405/1/6","1","99","AFN0","99","99"]]);
  expect(points).toHaveLength(1);
  expect(points[0]?.total).toBe(473);
  expect(weeklyChange(points)).toBeNull();
 });
 it("rejects changed headers so bad columns do not appear as real activity",()=>{
  expect(weeklyActivity([headers[0]!,headers[1]!,["له نېټې","تر نېټې","هفته","جدید او ثبت تولد","عواید","ناسم","تجدید"],["1405/1/1","1405/1/6","1","50","0","5","3"]])).toEqual([]);
 });
});
