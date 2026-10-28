import {describe,expect,it} from "vitest";
import {applyWhatsappTemplate,buildMissingReportsWhatsapp,DEFAULT_WHATSAPP_TEMPLATE,validateWhatsappTemplate} from "./missing-reports-whatsapp";
import type {StaffCompleteness} from "./monthly-staff-completeness";
function staff(missingNames:string[],status:"incomplete"|"complete"="incomplete"):StaffCompleteness{
 const missing=missingNames.map(name=>({name,role:"کارمند",activities:["ثبت"],submitted:false}));
 return {date:"1405/08/05",sheet:"عقرب",staff:missing,missing,status,totalCount:5,submittedCount:5-missing.length,message:""};
}
describe("editable WhatsApp message template",()=>{
 it("requires date and names placeholders",()=>{
  expect(validateWhatsappTemplate("سلام")).not.toBeNull();
  expect(validateWhatsappTemplate("{{date}}")).not.toBeNull();
  expect(validateWhatsappTemplate("{{names}}")).not.toBeNull();
  expect(validateWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE)).toBeNull();
 });
 it("fills a custom user-edited template with correct date and only missing names",()=>{
  const result=buildMissingReportsWhatsapp(staff(["مدبر"]),staff(["کریمي"]),"ورځ {{date}}\n{{names}}\nمننه");
  expect(result).toContain("ورځ 1405/08/05");
  expect(result).toContain("مدبر");
  expect(result).toContain("کریمي");
  expect(result).not.toContain("{{names}}");
 });
 it("does not create a reminder for fully reported groups",()=>{
  expect(buildMissingReportsWhatsapp(staff([],"complete"),staff([],"complete"))).toBeNull();
 });
 it("replaces all date references and leaves no placeholder",()=>{
  expect(applyWhatsappTemplate("{{date}} / {{date}}: {{names}}","1405/08/05","الف")).toBe("1405/08/05 / 1405/08/05: الف");
 });
});
