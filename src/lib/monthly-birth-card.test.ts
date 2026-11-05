import {describe,it,expect} from "vitest";
import {collectedPeopleThroughDate,newestCollectedPeople} from "./recent-referrals";
const row=(serial:number,name:string,code:string)=>[serial,name,"پلار",null,2,null,code];
describe("monthly birth-card matching",()=>{
 it("retains earlier intake dates for later verification",()=>{
  const grid:unknown[][]=[["تاریخ 12-08-1405"],row(1,"الف","123"),["تاریخ 14-08-1405"],row(1,"ب","456")];
  const today={d:14,m:8,y:1405};
  expect(newestCollectedPeople(grid,today,50).people).toHaveLength(1);
  expect(collectedPeopleThroughDate(grid,today).map(p=>p.fileCode)).toEqual(["123","456"]);
 });
 it("never includes future-dated monthly sections",()=>{
  const grid:unknown[][]=[["تاریخ 12-08-1405"],row(1,"الف","123"),["تاریخ 16-08-1405"],row(1,"ب","456")];
  expect(collectedPeopleThroughDate(grid,{d:14,m:8,y:1405}).map(p=>p.fileCode)).toEqual(["123"]);
 });
});
