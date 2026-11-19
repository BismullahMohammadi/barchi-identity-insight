import { formatJ, parseJalali, type JDate } from "./jalali";
import type { Cell } from "./normalize";

const formatter=new Intl.DateTimeFormat("en-US-u-ca-persian",{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"});

/** Calendar conversion uses Intl Persian calendar; no hardcoded yearly holiday list. */
export function isFridayJalali(date:JDate):boolean{
 const start=Date.UTC(date.y+621,2,18);
 const dayIndex=date.m<=6?(date.m-1)*31+date.d-1:186+(date.m-7)*30+date.d-1;
 for(let shift=0;shift<6;shift++){
  const candidate=new Date(start+(dayIndex+shift)*86400000);
  const parts=formatter.formatToParts(candidate);
  const field=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  if(field("year")===date.y&&field("month")===date.m&&field("day")===date.d)
   return candidate.getUTCDay()===5;
 }
 return false;
}
const EXPLICIT_HOLIDAY=/(?:رخصت(?:ي|ی|ۍ)?|تعطیل|تعطيل|عمومي\s*رخصتي|عمومی\s*رخصتی|holiday)/i;
export function holidayStatus(row:Cell[],dateCol:number):"friday"|"sheet" | null {
 const date=dateCol>=0?parseJalali(String(row[dateCol]??"")):null;
 if(!date)return null;
 if(isFridayJalali(date))return "friday";
 // Only explicitly labelled non-date cells qualify; never infer from zero quantities.
 return row.some((cell,i)=>i!==dateCol&&typeof cell==="string"&&EXPLICIT_HOLIDAY.test(cell))?"sheet":null;
}
export const holidayLabel=(status:"friday"|"sheet" | null)=>status==="friday"?"جمعه ـ عمومي رخصتي":status==="sheet"?"په شیټ کې ثبت شوې رخصتي":null;
export function holidayOfToday(today:JDate):string|null{return isFridayJalali(today)?"جمعه ـ عمومي رخصتي":null;}
