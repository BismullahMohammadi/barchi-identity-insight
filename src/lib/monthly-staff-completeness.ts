import { toLatinDigits, type JDate } from "./jalali";
export type StaffStatus={name:string;role:string;activities:string[];submitted:boolean};
export type CompletenessStatus="complete"|"incomplete"|"unavailable"|"nonwork";
export type StaffCompleteness={date:string;sheet:string;status:CompletenessStatus;staff:StaffStatus[];missing:StaffStatus[];submittedCount:number;totalCount:number;message:string};
export const MONTH_NAMES=["","حمل","ثور","جوزا","سرطان","اسد","سنبله","میزان","عقرب","قوس","جدی","دلو","حوت"];
function stringOf(x:unknown):string{return x===null||x===undefined?"":String(x).trim();}
function numeric(x:unknown):boolean {
 if(typeof x==="number")return Number.isFinite(x);
 const s=stringOf(x).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/,/g,"");
 return s!=="" && Number.isFinite(Number(s));
}
/** Find a sheet by its month rather than assuming a fixed sheet tab order. */
export function findReportMonth(titles:string[],month:number):string|null{
 const name=MONTH_NAMES[month];
 if(!name)return null;
 const matches=titles.filter(t=>t.replace(/\s+/g,"").includes(name));
 return matches.sort((a,b)=>{
  const score=(t:string)=>(/گزارش|ګزارش|ګزازش/i.test(t)?2:0)+(/ماه/i.test(t)?1:0);
  return score(b)-score(a);
 })[0]??null;
}
export function inspectStaffDay(grid:unknown[][],date:JDate,sheet:string):StaffCompleteness{
 const dateLabel=`${date.y}/${String(date.m).padStart(2,"0")}/${String(date.d).padStart(2,"0")}`;
 const unknown=(message:string):StaffCompleteness=>({date:dateLabel,sheet,status:"unavailable",staff:[],missing:[],submittedCount:0,totalCount:0,message});
 if(!sheet||!grid.length)return unknown("د ټاکلې میاشتې راپور ونه موندل شو.");
 // Some months begin at row 1, others have a cover/header on row 4.
 const headerIndex=grid.slice(0,8).findIndex(row=>stringOf(row[3]).includes("اسم") && stringOf(row[6]).includes("فعالیت") && numeric(row[7]));
 if(headerIndex<0)return unknown("د راپور د کارمندانو او ورځو کالمونه ونه پېژندل شول.");
 const header=grid[headerIndex]??[];
 const dayCol=header.findIndex((cell,i)=>i>=7 && numeric(cell)&&Number(toLatinDigits(stringOf(cell)))===date.d);
 if(dayCol<0)return unknown("د تېرې ورځې کالم په راپور کې نشته.");
 const people:StaffStatus[]=[];
 let current:StaffStatus|null=null;
 let valuesForPerson:boolean[]=[];
 const flush=()=>{
  if(current && current.activities.length){
   current.submitted=valuesForPerson.some(Boolean);people.push(current);
  }
 };
 for(const row of grid.slice(headerIndex+1)){
  const name=stringOf(row[3]),activity=stringOf(row[6]);
  if(name && name!=="اسم"){
   flush();
   current={name,role:stringOf(row[5]),activities:[],submitted:false};
   valuesForPerson=[];
  }
  if(!current||!activity || /^(مجموعه|جمله|مجموع|جمع)$/.test(activity))continue;
  // Each named worker may have multiple activities in successive merged-name rows.
  current.activities.push(activity);
  valuesForPerson.push(numeric(row[dayCol]));
 }
 flush();
 if(!people.length)return unknown("د ټاکلې میاشتې کارمندان په راپور کې ونه موندل شول.");
 const missing=people.filter(x=>!x.submitted);
 const complete=missing.length===0;
 return {date:dateLabel,sheet,status:complete?"complete":"incomplete",staff:people,missing,
  submittedCount:people.length-missing.length,totalCount:people.length,
  message:complete?"د ټولو ثبت شويو کارمندانو د تېرې ورځې راپورونه بشپړ شول.":`${missing.length} کارمندانو د تېرې ورځې راپور نه دی ثبت کړی.`};
}
