import {googleToken, required} from "./google-sheet-credentials";
import {yesterdayJalali,formatJ,type JDate} from "../src/lib/jalali";
import {findReportMonth,inspectStaffDay,type StaffCompleteness} from "../src/lib/monthly-staff-completeness";
import {findInsijamMonth,inspectInsijamDay} from "../src/lib/insijam-completeness";

const REQUIRED=["GOOGLE_SERVICE_ACCOUNT_JSON","SCHEDULE_SUPABASE_URL","SCHEDULE_SUPABASE_SERVICE_ROLE_KEY"] as const;
const REGISTRATION="1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8";
const INSIJAM="1W82u37NeQ4Og7rANME6i3jxj1aeCZhhvIj3YtmopQ2g";
async function getJSON<T>(url:string,token:string):Promise<T>{
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token}});
 if(!response.ok)throw new Error("Google spreadsheet read failed: "+response.status);
 return response.json() as Promise<T>;
}
async function monthlyReport(id:string,day:JDate,token:string,kind:"registration"|"insijam"):Promise<StaffCompleteness>{
 const meta=await getJSON<{sheets?:{properties?:{title?:string}}[]}>(
  `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets(properties(title))`,token);
 const titles=(meta.sheets??[]).map(x=>x.properties?.title).filter((v):v is string=>!!v);
 const title=kind==="registration"?findReportMonth(titles,day.m):findInsijamMonth(titles,day.m,day.y);
 if(!title)return kind==="registration"?inspectStaffDay([],day,""):inspectInsijamDay([],day,"");
 const range=encodeURIComponent(`'${title.replace(/'/g,"''")}'!A1:${kind==="registration"?"AL100":"AM90"}`);
 const result=await getJSON<{values?:unknown[][]}>(
  `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,token);
 return kind==="registration"?inspectStaffDay(result.values??[],day,title):inspectInsijamDay(result.values??[],day,title);
}
function sanitize(report:StaffCompleteness){
 return {date:report.date,sheet:report.sheet,status:report.status,
  submittedCount:report.submittedCount,totalCount:report.totalCount,
  missing:report.missing.map(x=>({name:x.name,role:x.role,activities:x.activities,submitted:false}))};
}
async function persist(row:Record<string,unknown>){
 const base=required("SCHEDULE_SUPABASE_URL").replace(/\/$/,"");
 const key=required("SCHEDULE_SUPABASE_SERVICE_ROLE_KEY");
 const response=await fetch(base+"/rest/v1/daily_report_checks?on_conflict=report_date",{
  method:"POST",headers:{"apikey":key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
  body:JSON.stringify(row),
 });
 if(!response.ok)throw new Error("Scheduled report status storage failed: "+response.status);
}
async function main(){
 for(const name of REQUIRED)required(name);
 const now=Date.now();
 const day=yesterdayJalali(now),date=formatJ(day);
 const friday=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kabul",weekday:"short"}).format(new Date(now-86400000))==="Fri";
 if(friday){
  await persist({report_date:date,status:"nonwork",missing_count:0,registration:null,insijam:null,error_text:null,checked_at:new Date().toISOString()});
  console.log("Scheduled check: Friday, no reminder.");return;
 }
 try{
  const token=await googleToken();
  const [registration,insijam]=await Promise.all([
   monthlyReport(REGISTRATION,day,token,"registration"),
   monthlyReport(INSIJAM,day,token,"insijam"),
  ]);
  const valid=["complete","incomplete"].includes(registration.status)&&["complete","incomplete"].includes(insijam.status)&&registration.totalCount>0&&insijam.totalCount>0;
  const missing=valid?registration.missing.length+insijam.missing.length:0;
  await persist({report_date:date,status:!valid?"unavailable":missing?"incomplete":"complete",
   registration:valid?sanitize(registration):null,insijam:valid?sanitize(insijam):null,
   missing_count:missing,error_text:valid?null:"One or more report layouts unavailable",checked_at:new Date().toISOString()});
  console.log("Scheduled check complete; status "+(!valid?"unavailable":missing?"incomplete":"complete")+".");
 }catch{
  // Do not mark staff missing if either Google Sheets source failed.
  await persist({report_date:date,status:"unavailable",missing_count:0,registration:null,insijam:null,
   error_text:"Scheduled report check failed",checked_at:new Date().toISOString()});
  throw new Error("Scheduled report check failed");
 }
}
await main();
