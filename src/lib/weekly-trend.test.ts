import {describe,it,expect} from "vitest";
import {weeklyActivity,weeklyChange,selectPreviousWeeks,type WeeklyPoint} from "./weekly-trend";
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
 it("shows the four completed weeks before today, never the last weeks of the year",()=>{
  const weeks:WeeklyPoint[]=Array.from({length:20},(_,i)=>({
   week:i+1,label:"اونۍ "+(i+1),
   from:`1405/01/${String(i+1).padStart(2,"0")}`,
   to:`1405/01/${String(i+2).padStart(2,"0")}`,
   total:100+i,passed:100+i,duplicate:0,renewal:0,
  }));
  const four=selectPreviousWeeks(weeks,{y:1405,m:1,d:12},4);
  expect(four.map(w=>w.week)).toEqual([7,8,9,10]);
  expect(selectPreviousWeeks(weeks,{y:1405,m:1,d:12},8).map(w=>w.week)).toEqual([3,4,5,6,7,8,9,10]);
  expect(selectPreviousWeeks(weeks,{y:1405,m:1,d:12},12)).toHaveLength(10);
 });
 it("does not include an ongoing week or any week ending today",()=>{
  const weeks:WeeklyPoint[]=[
   {week:1,label:"۱",from:"1405/01/01",to:"1405/01/06",total:8,passed:8,duplicate:0,renewal:0},
   {week:2,label:"۲",from:"1405/01/08",to:"1405/01/13",total:12,passed:12,duplicate:0,renewal:0},
   {week:3,label:"۳",from:"1405/01/15",to:"1405/01/20",total:15,passed:15,duplicate:0,renewal:0},
  ];
  expect(selectPreviousWeeks(weeks,{y:1405,m:1,d:13},4).map(w=>w.week)).toEqual([1]);
  expect(selectPreviousWeeks(weeks,{y:1405,m:1,d:14},4).map(w=>w.week)).toEqual([1,2]);
 });
});
