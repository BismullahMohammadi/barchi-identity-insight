import { describe, expect, it } from "vitest";
import { buildYesterdayAdvice } from "./daily-advice";
const yesterday={y:1405,m:7,d:29};
const make=(rows:string[][])=>[{slug:"total",title:"مجموعی راپور",grid:[["سرلیک"],[],[],["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],...rows]}];
describe("previous day advice",()=>{
 it("requires exact yesterday row, never pretends absent data is zero",()=>{
  const x=buildYesterdayAdvice(make([["1405/07/28","10","1000","20","0","9","0","0"]]),yesterday);
  expect(x.hasReport).toBe(false);expect(x.title).toMatch(/نه دی ثبت/);
 });
 it("flags meaningful decline from the prior recorded day",()=>{
  const x=buildYesterdayAdvice(make([["1405/07/28","10","1000","100","0","9","0","0"],["1405/07/29","10","1000","50","0","9","0","0"]]),yesterday);
  expect(x.hasReport).toBe(true);expect(x.title).toBe("د فعالیت کموالی");expect(x.message).toMatch(/50٪/);
 });
 it("shows a cautious fallback when previous counts were zero",()=>{
  const x=buildYesterdayAdvice(make([["1405/07/28","0","0","0","0","0","0","0"],["1405/07/29","10","1000","50","0","9","0","0"]]),yesterday);
  expect(x.hasReport).toBe(true);expect(x.title).toBe("د نن لپاره مدیریتي وړاندیز");
 });
});
