import type {JDate} from "./jalali";
import {formatJ,toLatinDigits} from "./jalali";
import {MONTH_NAMES,type StaffStatus,type StaffCompleteness} from "./monthly-staff-completeness";

const txt=(v:unknown)=>v===null||v===undefined?"":String(v).trim();
/** Google Sheets formats monetary amounts as e.g. "؋ 49,500".
 * An actual formatted amount, including zero, is a submitted report.
 * Decorative strings, blank cells and spreadsheet errors are not. */
export function hasSubmittedInsijamValue(value:unknown):boolean {
 let s=toLatinDigits(txt(value)).replace(/[\u00a0\u202f\s]/g,"");
 if(!s)return false;
 s=s.replace(/^(?:؋|AFN)/i,"").replace(/(?:؋|AFN)$/i,"").replace(/[٬,]/g,"").replace(/٫/g,".");
 return /^[+-]?\d+(?:\.\d+)?$/.test(s) && Number.isFinite(Number(s));
}
const excluded=(name:string)=>/جاوید\s*ملک\s*زاد/i.test(name.replace(/ي/g,"ی").replace(/ك/g,"ک"));
export function findInsijamMonth(titles:string[],month:number):string|null {
 const word=MONTH_NAMES[month];
 if(!word)return null;
 const compact=(v:string)=>v.replace(/\s+/g,"").replace(/[يى]/g,"ی").replace(/ك/g,"ک");
 return titles.find(t=>compact(t).includes(compact(word))&&/1405|۱۴۰۵/.test(toLatinDigits(t)))??null;
}
/** Insijam workbook: A=row number, B=staff, D=department, E=activity, F:AJ=day 1..31.
 * Excel rows 7 and 8 are placeholders; Javed Malekzada is explicitly excluded.
 */
export function inspectInsijamDay(grid:unknown[][],date:JDate,sheet:string):StaffCompleteness {
 const label=formatJ(date);
 const unavailable=(message:string):StaffCompleteness=>({date:label,sheet,status:"unavailable",staff:[],missing:[],submittedCount:0,totalCount:0,message});
 if(!grid.length||!sheet)return unavailable("د انسجام میاشتنی شیټ نه دی ترلاسه شوی.");
 const headerIndex=grid.slice(0,8).findIndex(r=>txt(r[1]).includes("اسم")&&txt(r[4]).includes("تقسیم")&&toLatinDigits(txt(r[5]))==="1");
 if(headerIndex<0)return unavailable("د انسجام د ورځو او کارمندانو کالمونه ونه پېژندل شول.");
 const dayCol=grid[headerIndex]!.findIndex((v,i)=>i>=5 && Number(toLatinDigits(txt(v)))===date.d);
 if(dayCol<0)return unavailable("د انسجام په شیټ کې د تېرې ورځې کالم نشته.");
 const staff:StaffStatus[]=[];
 let current:StaffStatus|null=null;
 let present:boolean[]=[];
 const flush=()=>{
  if(current&&current.activities.length){
   current.submitted=present.some(Boolean);
   staff.push(current);
  }
 };
 grid.forEach((row,index)=>{
  // Sheet row numbers are one-based, not array positions after a header.
  const excelRow=index+1;
  if(excelRow<=headerIndex+1||excelRow===7||excelRow===8)return;
  const name=txt(row[1]), activity=txt(row[4]),role=txt(row[3]);
  if(name){
   flush();current=excluded(name)?null:{name,role,activities:[],submitted:false};
   present=[];
  }
  if(!current||!activity||/^(جمع|مجموع|جمله)$/i.test(activity))return;
  current.activities.push(activity);
  present.push(hasSubmittedInsijamValue(row[dayCol]));
 });
 flush();
 if(!staff.length)return unavailable("د انسجام د کارمندانو ثبت شوي قطارونه ونه موندل شول.");
 const missing=staff.filter(x=>!x.submitted);
 return {date:label,sheet,staff,missing,submittedCount:staff.length-missing.length,totalCount:staff.length,
  status:missing.length?"incomplete":"complete",
  message:missing.length?`د انسجام ${missing.length} کارمندانو راپورونه پاتې دي.`:"د انسجام د کارمندانو راپورونه بشپړ دي."};
}
