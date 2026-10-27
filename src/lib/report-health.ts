import { formatJ, jKey, type JDate } from "./jalali";
import { normalizeGrid } from "./normalize";

export type HealthSource = {slug:string;title:string;grid:string[][]};
export type ReportHealth = {slug:string;name:string;state:"submitted"|"missing"|"invalid"|"monthly";lastDate:string|null};
const LABELS:Record<string,string>={
 total:"مجموعي راپور",identity:"تثبیت هویت",control:"کنټرول کیفیت",services:"خدمات",
 bank:"بانکي عواید",distribution:"توزیع","archive-scan":"د آرشیف دوسیو سکن",arrivals:"تذکرو انتقالات",annual:"کلنی راپور"
};
/** Indicates whether a dated source has at least one valid row for the requested day.
 * No inference that an unsubmitted report means zero output or poor performance. */
export function getReportHealth(tabs:HealthSource[],date:JDate):ReportHealth[]{
 return Object.entries(LABELS).map(([slug,name])=>{
  const src=tabs.find(t=>t.slug===slug);
  if(!src)return {slug,name,state:"missing" as const,lastDate:null};
  try{
   const table=normalizeGrid(src.grid,src.title);
   if(table.dateCol<0)return {slug,name,state:"monthly" as const,lastDate:null};
   const dates=table.dates.filter((d):d is JDate=>d!==null);
   const last=dates.sort((a,b)=>jKey(b)-jKey(a))[0];
   const submitted=dates.some(d=>jKey(d)===jKey(date));
   return {slug,name,state:submitted?"submitted" as const:"missing" as const,lastDate:last?formatJ(last):null};
  }catch{return {slug,name,state:"invalid" as const,lastDate:null};}
 });
}
