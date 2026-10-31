import { describe, expect, it } from "vitest";
import { normalizeGrid } from "./normalize";
import { deriveOverviewFive, sourceMetric } from "./overview-five";

const today={y:1405,m:1,d:3};
const yesterday={y:1405,m:1,d:2};
const total={slug:"total",title:"مجموعی راپور",grid:[
 ["د مرکز راپور"],[],[],["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],
 ["۱۴۰۵/۰۱/۰۲","0","AFN 0","0","0","0","AFN 0","AFN 0"],
 ["۱۴۰۵/۰۱/۰۳","64","AFN 32,000","65","-500","71","AFN 0","AFN 15,000"],
]};
const bank={slug:"bank",title:"بانکي عواید",grid:[
 ["بانکي عواید"],[],[],["نېټه","جدید او ثبت تولد","مثنی","تجدید","مثنی او تجدید","انفرادی تعداد","مجموعه"],
 ["۱۴۰۵/۰۱/۰۲","0","0","0","0","0","0"],
 ["۱۴۰۵/۰۱/۰۳","32000","15000","0","15000","64","47000"],
]};
const services={slug:"services",title:"خدمات",grid:[
 ["د خدماتو راپور"],[],[],["نیټه","مثنی","تجدید","ثبت تولد","ثبت ازدواج","مجموعه","عواید (مثنی، تجدید)"],
 ["۱۴۰۵/۰۱/۰۳","5","10","2","0","17","AFN 15,000"],
]};
const identity={slug:"identity",title:"تثبت هویت",grid:[
 ["د تثبیت هویت راپور"],[],
 ["نېټه","سید نثار","ګل واری","","خلیل","ایوب زاده","شغله","صدیقه","کاغذي تذکرې مطابق","تعین سن","جمله"],
 ["۱۴۰۵/۰۱/۰۳","","","","","","","","75","8","83"],
]};
const distribution={slug:"distribution",title:"توزیع",grid:[
 ["توزیع"],[],[],["نیټه","بخش اول","بخش دوم","مجموعه"],
 ["۱۴۰۵/۰۱/۰۳","40","31","71"]
]};
describe("Overview five KPI source mapping",()=>{
 it("parses the real identity columns even when employee data are empty",()=>{
  const table=normalizeGrid(identity.grid,identity.title);
  expect(table.numericCols).toContain(9);
  expect(table.rows[0]?.[8]).toBe(75);
  expect(table.rows[0]?.[9]).toBe(8);
  expect(table.rows[0]?.[10]).toBe(83);
 });
 it("computes individual total as passed plus duplicate plus renewal",()=>{
  const values=deriveOverviewFive([total,bank,services,identity,distribution],"today",today,yesterday);
  expect(values.individual.value).toBe(80);
  expect(values.newCards.value).toBe(65);
  expect(values.income.value).toBe(47000);
  expect(values.identity.value).toBe(83);
  expect(values.distribution.value).toBe(71);
 });
 it("refuses to mislabel incomplete individual totals as complete",()=>{
  const values=deriveOverviewFive([total,identity],"today",today,yesterday);
  expect(values.individual.value).toBeNull();
  expect(values.newCards.value).toBe(65);
 });
 it("distinguishes previous-day missing data from actual recorded zero",()=>{
  expect(sourceMetric([identity],"identity",10,"yesterday",today,yesterday).value).toBeNull();
  expect(sourceMetric([total],"total",3,"yesterday",today,yesterday).value).toBe(0);
 });
});
