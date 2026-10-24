import {describe,expect,it} from "vitest";
import {buildManagementAdvice} from "./management-advisor";
const day={y:1405,m:7,d:29};
const total=(passed:number)=>({slug:"total",title:"مجموعی راپور",grid:[
 ["سرلیک"],[],[],["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],
 ["۱۴۰۵/۰۷/۲۸","20","10000","100","0","90","0","0"],
 ["۱۴۰۵/۰۷/۲۹","20","10000",String(passed),"0","90","0","0"],
]});
const control=(count:number)=>({slug:"control",title:"کنټرول",grid:[
 ["سرلیک"],[],[],["نیټه","اول ټیم (ایمان)","دوهم ټیم (هاشمی)","دریم ټیم (الطاف)","څلورم ټیم (علی رضایی)","ثبت تولد","مجموعه"],
 ["۱۴۰۵/۰۷/۲۹","20","10","5","5","0",String(count)],
]});
describe("integrated management advice",()=>{
 it("prioritizes verifying a discrepancy and includes unfinished task count",()=>{
  const advice=buildManagementAdvice([total(50),control(45)],[{title:"دنده",done:false}],day);
  expect(advice.title).toMatch(/تطبیق/);
  expect(advice.evidence.join(" ")).toMatch(/پاتې دندې/);
  expect(advice.recommendation).toMatch(/۵/);
 });
 it("does not fabricate daily reports from missing sources",()=>{
  const advice=buildManagementAdvice([],[{title:"دنده",done:false}],day);
  expect(advice.missing).toContain("مجموعي راپور");
  expect(advice.title).toMatch(/معلوماتو/);
 });
 it("prioritizes significant throughput drop when figures agree",()=>{
  const advice=buildManagementAdvice([total(50),control(50)],[],day);
  expect(advice.title).toMatch(/ښه والي/);
 });
});
