import { parseJalali, jKey, formatJ } from "./jalali";
import { parseNumber } from "./normalize";

/** The dedicated weekly report uses A/B dates, C week no., D passed, E AFN, F duplicates, G renewals.
 * Avoid summing AFN with counts, and never fabricate missing week components. */
export type WeeklyPoint={week:number;label:string;from:string;to:string;total:number;passed:number;duplicate:number;renewal:number};
export function weeklyActivity(grid:string[][]):WeeklyPoint[]{
 const header=grid[2]??[];
 const check=["له نېټې","تر نېټې","هفته","جدید او ثبت تولد","عواید","مثنی","تجدید"];
 if(check.some((h,i)=>String(header[i]??"").replace(/\s+/g,"")!==h.replace(/\s+/g,""))) return [];
 const weeks=new Map<number,WeeklyPoint>();
 for(const row of grid.slice(3)){
  const from=parseJalali(row[0]??""); const to=parseJalali(row[1]??"");
  const week=parseNumber(row[2]);
  const passed=parseNumber(row[3]), duplicate=parseNumber(row[5]),renewal=parseNumber(row[6]);
  if(!from||!to||jKey(from)>jKey(to)||week===null||!Number.isInteger(week)||week<1||week>54||passed===null||duplicate===null||renewal===null)continue;
  if([passed,duplicate,renewal].some(n=>n<0))continue;
  const point={week,label:"اونۍ "+week,from:formatJ(from),to:formatJ(to),total:passed+duplicate+renewal,passed,duplicate,renewal};
  // If the source contains duplicate weeks, do not double-count them.
  if(!weeks.has(week)) weeks.set(week,point);
 }
 return [...weeks.values()].sort((a,b)=>a.week-b.week);
}
export function weeklyChange(points:WeeklyPoint[]):number|null{
 const latest=points.at(-1),prior=points.at(-2);
 if(!latest||!prior||prior.total===0)return null;
 return Math.round((latest.total-prior.total)*100/prior.total);
}
