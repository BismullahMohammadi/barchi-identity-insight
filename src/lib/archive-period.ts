import { type JDate, formatJ, jKey } from "./jalali";
import type { DateFilter } from "./normalize";

export type ArchivePeriod = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "all";
export const ARCHIVE_PERIOD_OPTIONS:readonly {value:ArchivePeriod;label:string}[]=[
 {value:"today",label:"نن"},
 {value:"yesterday",label:"تېره ورځ"},
 {value:"thisWeek",label:"روانه اونۍ"},
 {value:"lastWeek",label:"تېره اونۍ"},
 {value:"thisMonth",label:"روانه میاشت"},
 {value:"lastMonth",label:"تېره میاشت"},
 {value:"all",label:"ټول معلومات"},
];

const DAY_MS=86_400_000;
/** Kabul's civil day is stable (no DST); format Gregorian timestamps in Afghan Jalali. */
function jalaliAt(date:Date):JDate {
 const parts = new Intl.DateTimeFormat("en-US-u-ca-persian",{
  timeZone:"Asia/Kabul",year:"numeric",month:"numeric",day:"numeric"
 }).formatToParts(date);
 const value=(type:string)=>Number(parts.find(part=>part.type===type)?.value);
 return {y:value("year"),m:value("month"),d:value("day")};
}
function daysBefore(now:Date,days:number):JDate {
 return jalaliAt(new Date(now.getTime()-days*DAY_MS));
}
function weekIndex(now:Date):number {
 const day = new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kabul",weekday:"short"}).format(now);
 const idx=["Sat","Sun","Mon","Tue","Wed","Thu","Fri"].indexOf(day);
 if(idx<0)throw new Error("WEEKDAY_UNAVAILABLE");
 return idx;
}
export function archivePeriodRange(period:ArchivePeriod,now:Date=new Date()):DateFilter {
 const today=jalaliAt(now);
 if(period==="all")return {from:null,to:null};
 if(period==="today")return {from:today,to:today};
 if(period==="yesterday"){
  const yesterday=daysBefore(now,1);
  return {from:yesterday,to:yesterday};
 }
 const index=weekIndex(now);
 if(period==="thisWeek")return {from:daysBefore(now,index),to:today};
 if(period==="lastWeek")return {from:daysBefore(now,index+7),to:daysBefore(now,index+1)};
 if(period==="thisMonth")return {from:{y:today.y,m:today.m,d:1},to:today};
 const y=today.m===1?today.y-1:today.y;
 const m=today.m===1?12:today.m-1;
 return {from:{y,m,d:1},to:{y,m,d:m<=6?31:30}};
}
export function archivePeriodCaption(range:DateFilter):string {
 if(!range.from&&!range.to)return "ټولې ثبت شوې ورځې";
 const from=range.from?formatJ(range.from):"لومړی ثبت";
 const to=range.to?formatJ(range.to):"وروستی ثبت";
 return jKey(range.from??range.to!)===jKey(range.to??range.from!)?from:`${from} — ${to}`;
}
