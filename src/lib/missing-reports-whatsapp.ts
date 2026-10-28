import type {StaffCompleteness} from "./monthly-staff-completeness";

/** The message is generated from confirmed missing reports only.
 * Source errors, a non-working day or mismatched dates must never produce accusations. */
export function buildMissingReportsWhatsapp(registration:StaffCompleteness,insijam:StaffCompleteness):string|null{
 if(registration.date!==insijam.date) return null;
 if(!["complete","incomplete"].includes(registration.status)||!["complete","incomplete"].includes(insijam.status))return null;
 if(!registration.totalCount||!insijam.totalCount)return null;
 const sections=[
  {name:"د نوم‌لیکنې، وېش او وېش وروسته خدمتونو مدیریت",items:registration.missing},
  {name:"د انسجام مدیریت",items:insijam.missing},
 ].filter(x=>x.items.length>0);
 if(!sections.length)return null;
 const entries=sections.map(s=>{
  const names=[...new Set(s.items.map(x=>x.name.trim()).filter(Boolean))];
  return "*"+s.name+"*\n"+names.map((name,i)=>`${i+1}. ${name}`).join("\n");
 });
 return `السلام علیکم ورحمة الله وبرکاته!

*د ${registration.date} نېټې د ورځنیو راپورونو یادونه*

د راپورونو د ثبت د وروستۍ کتنې له مخې، د لاندې همکارانو د یادې نېټې راپورونه لا په اړوندو شیټونو کې نه دي تایید شوي:

${entries.join("\n\n")}

له درنو همکارانو هیله کېږي چې خپل راپورونه وګوري، که لا نه وي ثبت شوي نو بشپړ یې کړي؛ او که مخکې یې ثبت کړي وي، مهرباني وکړئ خبر راکړئ چې معلومات بیا وکتل شي.

له همکارۍ مو مننه.
د مرکز مدیریت`;
}
