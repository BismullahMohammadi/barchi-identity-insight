import { formatJ, jKey, type JDate } from "./jalali";
import { normalizeGrid, type NormalizedTable } from "./normalize";

export type ReportSource={slug:string;title:string;grid:string[][]};
export type AdviceTask={title:string;done:boolean};
export type ManagementAdvice={
 date:string; title:string; recommendation:string; evidence:string[];
 action:string; coverage:string[]; missing:string[];
};
const SOURCES=[
 ["total","مجموعي راپور"],["identity","تثبیت هویت"],["control","کنټرول"],
 ["distribution","توزیع"],["bank","بانکي عواید"],["services","خدمات"],
 ["arrivals","د تذکرو انتقالات"],["annual","کلنی راپور"],
] as const;
const metrics:Record<string,number>={total:3,identity:10,control:6,distribution:3,bank:6,services:5,arrivals:2,annual:14};
const fmt=(n:number)=>n.toLocaleString("fa-AF");
function rowsForDate(t:NormalizedTable,date:JDate){
 return t.rows.filter((r,i)=>t.dates[i]&&jKey(t.dates[i]!)===jKey(date));
}
function numberAt(t:NormalizedTable,date:JDate,col:number):number|null{
 if(!t.numericCols.includes(col))return null;
 const values=rowsForDate(t,date).map(row=>row[col]).filter((x):x is number=>typeof x==="number");
 return values.length?values.reduce((a,b)=>a+b,0):null;
}
function priorValue(t:NormalizedTable,date:JDate,col:number):{n:number;date:JDate}|null{
 const priorDates=t.dates.filter((d):d is JDate=>!!d&&jKey(d)<jKey(date)).sort((a,b)=>jKey(b)-jKey(a));
 for(const d of priorDates){const n=numberAt(t,d,col);if(n!==null)return {n,date:d};}
 return null;
}
function found(tabs:ReportSource[],slug:string):NormalizedTable|null{
 const tab=tabs.find(t=>t.slug===slug);
 if(!tab)return null;
 try{return normalizeGrid(tab.grid,tab.title);}catch{return null;}
}
/** Transparent on-device, rule-based managerial advice. Does not contact an external AI provider. */
export function buildManagementAdvice(tabs:ReportSource[],tasks:AdviceTask[],yesterday:JDate):ManagementAdvice{
 const date=formatJ(yesterday);
 const evidence:string[]=[];
 const coverage:string[]=[];
 const missing:string[]=[];
 const counts=new Map<string,number>();
 const tables=new Map<string,NormalizedTable>();
 for(const [slug,label] of SOURCES){
  const table=found(tabs,slug);
  if(!table){missing.push(label);continue;}
  tables.set(slug,table);
  const col=metrics[slug]!;
  if(slug==="annual"){
   // Annual is a monthly aggregate and must not be presented as yesterday's result.
   coverage.push("کلنی راپور (د اوږدمهاله رجحان لپاره)");
   continue;
  }
  const n=numberAt(table,yesterday,col);
  if(n===null){missing.push(label);continue;}
  counts.set(slug,n);coverage.push(label);
  evidence.push(label+": "+fmt(n)+(slug==="bank"?" AFN":""));
 }
 const outstanding=tasks.filter(t=>!t.done);
 if(tasks.length){coverage.push("دندې");evidence.push("پاتې دندې: "+fmt(outstanding.length));}
 else missing.push("دندو لېست (دندې نه دي ثبت شوې)");
 const passed=counts.get("total");
 const qc=counts.get("control");
 const identity=counts.get("identity");
 const services=counts.get("services");
 const bank=counts.get("bank");
 const dist=counts.get("distribution");
 const main=tables.get("total");
 const previous=main?priorValue(main,yesterday,3):null;
 const pct=passed!==undefined&&previous&&previous.n>0?Math.round((passed-previous.n)*100/previous.n):null;
 let title="د نن لپاره مدیریتي لومړیتوب";
 let recommendation="د مرکز د راپورونو او پاتې دندو وضعیت په ګډه وڅېړئ.";
 let action="لومړی پاتې مهم کارونه وټاکئ، بیا د اړوندو څانګو راپورونه تایید کړئ.";
 if(passed===undefined){
  title="د معلوماتو بشپړتیا لومړیتوب";
  recommendation="د پرون مجموعي راپور موجود یا تایید شوی نه دی. له نیمګړو ارقامو څخه د فعالیت په اړه قطعي پایله مه اخلئ.";
  action="د مجموعي راپور د پرون پاڼه بشپړه او د نورو برخو له ثبت سره یې همغږې کړئ.";
 }else if(qc!==undefined&&qc!==passed){
  title="د راپورونو د تطبیق لومړیتوب";
  recommendation="د پاس شويو تذکرو او کنټرول ثبت شوي شمېر "+fmt(Math.abs(qc-passed))+" توپیر لري؛ دا حتمي تېروتنه نه ده، ځکه د راپورونو تعریف یا ثبت وخت توپیر کولی شي.";
  action="د کنټرول مسئول او د مجموعي راپور ترتیب کوونکی دې د پرون ارقام او کټګورۍ سره تطبیق کړي.";
 }else if(pct!==null&&pct<=-20){
  title="د کار جریان د ښه والي لومړیتوب";
  recommendation="د تېر ثبت شوي راپور په پرتله د پاس شويو دوسیو شمېر "+fmt(Math.abs(pct))+"٪ کم شوی. له رسمي رخصتۍ، د مراجعینو شمېر او د کار د بندېدو له معلومولو پرته یې د کارمندانو کمزوري مه ګڼئ.";
  action="د ثبت، تثبیت هویت، کنټرول او چاپ له مسئولینو سره د ځنډ علت معلوم کړئ.";
 }else if(passed===0){
  title="د فعالیت د نه ثبتېدو ارزونه";
  recommendation="د پرون لپاره د پاس شويو تذکرو صفر ثبت شوی؛ د رخصتۍ یا د راپور د نه بشپړېدو امکان باید وکتل شي.";
  action="د پرون د رسمي فعالیت او د معلوماتو د ثبت وضعیت تایید کړئ.";
 }else if(outstanding.length>=5){
  title="د مدیریتي دندو د تنظیم لومړیتوب";
  recommendation="د مرکز د کارونو ترڅنګ "+fmt(outstanding.length)+" شخصي دندې لا پاتې دي. د ټولو یوځای ترسره کول ممکن مهم کارونه وځنډوي.";
  action="له پاتې دندو درې اړینې وټاکئ او هرې یوې ته د بشپړېدو مشخص وخت ورکړئ.";
 }else if(pct!==null&&pct>=20){
  title="د ښه فعالیت د دوام وړاندیز";
  recommendation="د تېر ثبت شوي راپور په پرتله پاس شوې دوسیې "+fmt(pct)+"٪ زیاتې دي؛ د پرمختګ لاملونه باید مستند شي.";
  action="د اغېزمنو ټیمونو کاري طریقه وارزوئ او د کیفیت د ساتلو لپاره یې شریکه کړئ.";
 }else if(bank!==undefined&&services!==undefined&&identity!==undefined&&dist!==undefined){
  title="د څانګو د همغږۍ وړاندیز";
  recommendation="د پرون لپاره د عوایدو، خدماتو، تثبیت هویت، کنټرول او توزیع راپورونه په ګډه موجود دي. د دغو ارقامو اندازه او واحدونه توپیر لري؛ مستقیم مساوي کول یې سم نه دي.";
  action="د څانګو د پاتې کارونو او د راپورونو د وخت پر سمون تمرکز وکړئ.";
 }
 return {date,title,recommendation,evidence,action,coverage,missing};
}
