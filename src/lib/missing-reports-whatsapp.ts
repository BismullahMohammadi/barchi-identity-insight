import type {StaffCompleteness} from "./monthly-staff-completeness";

/** The message is generated from confirmed missing reports only.
 * Source errors, a non-working day or mismatched dates must never produce accusations. */
export function buildMissingReportsWhatsapp(registration:StaffCompleteness,insijam:StaffCompleteness):string|null{
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
 return `*د ${registration.date} راپورونه / گزارش‌های ${registration.date}*

*پښتو:* لاندې همکارانو، مهرباني وکړئ پاتې راپورونه ثبت کړئ؛ که مو ثبت کړي وي، خبر راکړئ.
*دری:* همکاران ذیل لطفاً گزارش‌های باقی‌مانده را ثبت کنند؛ اگر ثبت کرده‌اند، اطلاع دهند.

${entries.join("\n\n")}

مننه / تشکر
*د مرکز مدیریت / مدیریت مرکز*`;
}
