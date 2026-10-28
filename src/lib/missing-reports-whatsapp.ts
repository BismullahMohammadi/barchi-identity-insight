import type {StaffCompleteness} from "./monthly-staff-completeness";

export const DEFAULT_WHATSAPP_TEMPLATE = `*د {{date}} راپورونه / گزارش‌های {{date}}*

*پښتو:* لاندې همکارانو، مهرباني وکړئ پاتې راپورونه ثبت کړئ؛ که مو ثبت کړي وي، خبر راکړئ.
*دری:* همکاران ذیل لطفاً گزارش‌های باقی‌مانده را ثبت کنند؛ اگر ثبت کرده‌اند، اطلاع دهند.

{{names}}

مننه / تشکر
*د مرکز مدیریت / مدیریت مرکز*`;

export const WHATSAPP_TEMPLATE_KEY="barchi-whatsapp-template-v1";

/** Both placeholders must remain to avoid sending a nameless or undated reminder. */
export function validateWhatsappTemplate(template:string):string|null {
 if(!template.trim()) return "د پیغام متن تش نه شي پاتې کېدای.";
 if(template.length>3000) return "د پیغام متن باید له ۳۰۰۰ تورو لنډ وي.";
 if(!template.includes("{{date}}")||!template.includes("{{names}}"))
  return "په ټیمپلیټ کې {{date}} او {{names}} دواړه باید موجود وي.";
 return null;
}
export function applyWhatsappTemplate(template:string,date:string,names:string):string {
 return template.replaceAll("{{date}}",date).replaceAll("{{names}}",names);
}


/** The message is generated from confirmed missing reports only.
 * Source errors, a non-working day or mismatched dates must never produce accusations. */
export function buildMissingReportsWhatsapp(registration:StaffCompleteness,insijam:StaffCompleteness,template:string=DEFAULT_WHATSAPP_TEMPLATE):string|null{
 if(registration.date!==insijam.date) return null;
 if(!["complete","incomplete"].includes(registration.status)||!["complete","incomplete"].includes(insijam.status))return null;
 if(!registration.totalCount||!insijam.totalCount)return null;
 const sections=[
  {name:"نوم‌لیکنه او وېش / ثبت‌نام و توزیع",items:registration.missing},
  {name:"انسجام / انسجام",items:insijam.missing},
 ].filter(x=>x.items.length>0);
 if(!sections.length)return null;
 const entries=sections.map(section=>{
  const names=[...new Set(section.items.map(x=>x.name.trim()).filter(Boolean))];
  return "*"+section.name+"*\n"+names.map((name,i)=>`${i+1}. ${name}`).join("\n");
 });
 if(validateWhatsappTemplate(template))return null;
 return applyWhatsappTemplate(template,registration.date,entries.join("\n\n"));
}
