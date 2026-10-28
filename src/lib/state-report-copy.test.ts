import {describe,it,expect} from "vitest";
import {extractStateReport,stateReportTsv} from "./state-report-copy";
const rows:unknown[][]=[
 ["بخشونه (میزان ۷)",1,2,3],["چک اسناد",25,35,20],
 [],["بخشونه (عقرب ۸)",1,2,3,4,5],
 ["چک اسناد",10,20,30,40,50],["تعین سن",0,1,0,1,0],["کنترل کیفیت",1,2,3,4,5],[],
];
describe("State report copy",()=>{
 it("uses the chosen month/day and keeps rows in order",()=>{
  const report=extractStateReport(rows,{y:1405,m:8,d:5});
  expect(report.status).toBe("available");
  expect(report.rows.map(r=>r.value)).toEqual(["50","0","5"]);
  expect(stateReportTsv(report)).toBe(["50","0","5"].join("\n"));
  expect(stateReportTsv(report)).not.toContain("چک اسناد");
  expect(stateReportTsv(report)).not.toContain("1405/08/05");
 });
 it("does not copy error values",()=>{
  const copy=rows.map(r=>[...r]);copy[4]![5]="#NAME?";
  expect(extractStateReport(copy,{y:1405,m:8,d:5}).status).toBe("invalid");
 });
});
