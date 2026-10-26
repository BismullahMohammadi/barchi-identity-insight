import {describe,expect,it} from "vitest";
import {getReportHealth} from "./report-health";
const day={y:1405,m:7,d:29};
const tab={slug:"total",title:"مجموعی راپور",grid:[
 ["سرلیک"],[],[],["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],
 ["۱۴۰۵/۰۷/۲۹","10","AFN 5000","10","0","8","0","0"]
]};
describe("report completeness",()=>{
 it("only accepts a dated row for requested day",()=>{
  const data=getReportHealth([tab],day);
  expect(data.find(x=>x.slug==="total")?.state).toBe("submitted");
  expect(data.find(x=>x.slug==="control")?.state).toBe("missing");
 });
 it("never treats older reports as submitted today",()=>{
  const data=getReportHealth([tab],{y:1405,m:7,d:30});
  expect(data.find(x=>x.slug==="total")?.state).toBe("missing");
  expect(data.find(x=>x.slug==="total")?.lastDate).toBe("1405/07/29");
 });
});
