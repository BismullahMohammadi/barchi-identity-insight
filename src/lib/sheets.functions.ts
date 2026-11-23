import { loadProblemVisitors, matchRecordKey, rememberProblemMatches } from "./problem-visitor-sheet.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import { hasDashboardPermission, hasDashboardPermissions } from "./dashboard-permissions.server";
import { SPREADSHEET_ID, TABS } from "./tabs";
import { todayJalali, yesterdayJalali, formatJ, jKey, parseJalali, type JDate } from "./jalali";
import { isFridayJalali } from "./holidays";
import { findReportMonth, inspectStaffDay, type StaffCompleteness } from "./monthly-staff-completeness";
import {findInsijamMonth,inspectInsijamDay} from "./insijam-completeness";
import {extractStateReport,type StateReport} from "./state-report-copy";
import { selectDailyTab, selectTodayCoordinationTab, parseCoordinationTabDate } from "./daily-forms";
import { cellIndex, findReferralTotal, normalizeReferralCell } from "./referral-cell";
import {newestCollectedPeople,collectedPeopleThroughDate,collectedPeopleInRange,newestRegisteredPeople,registrationTeamCounts,type RecentReferrals} from "./recent-referrals";
import {extractRejectedFiles,normalizeFileCode} from "./rejection-reasons";
import {birthCardConfirmations,dailyApprovalDetails} from "./birth-card-confirmations";
import {matchesRegisteredPerson} from "./registration-match";
import {findPotentialProblemMatches} from "./problem-visitor-matching";
import type {SupabaseClient} from "@supabase/supabase-js";
import {MONTH_NAMES} from "./monthly-staff-completeness";
import {sheetConnectionHeaders} from "./sheets-access.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
function emailFromClaims(claims: unknown): string | null {
  const c = claims as { email?: unknown; user_metadata?: {email?: unknown} } | null;
  return typeof c?.email === "string" ? c.email : null;
}
function ownerAuthorized(claims: unknown): boolean {
  return isEmailAllowed(emailFromClaims(claims), process.env["OWNER_EMAILS"]);
}
export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const email = emailFromClaims(context.claims);
    const owner=ownerAuthorized(context.claims);
    if(owner)return {email,allowed:true,owner:true,permissions:{} as Record<string,string[]>,allowlistConfigured:true};
    const {data:profile,error}=await (context.supabase as unknown as SupabaseClient).from("dashboard_user_permissions")
      .select("active,role,permissions").eq("user_id",context.userId).maybeSingle();
    if (error) throw new Error("PERMISSIONS_READ_FAILED");
    const perms=( profile?.active===true && profile.role==="manager" && profile.permissions && typeof profile.permissions==="object")
      ? profile.permissions as Record<string,string[]> : {};
    return {email,allowed:Object.values(perms).some(actions=>Array.isArray(actions)&&actions.includes("view")),owner:false,permissions:perms,allowlistConfigured:!!process.env["OWNER_EMAILS"]?.trim()};
  });
export type SheetPayload = { fetchedAt: number; tabs: {slug:string;title:string;grid:string[][]}[] };
export const getSheetTabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {slugs: string[]}) => {
    if (!input || !Array.isArray(input.slugs) || !input.slugs.length || input.slugs.length > 12 || new Set(input.slugs).size !== input.slugs.length || input.slugs.some(s=>!TABS.some(t=>t.slug===s))) throw new Error("Invalid tabs");
    return {slugs:input.slugs};
  })
  .handler(async ({data,context}):Promise<SheetPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!await hasDashboardPermissions(context,data.slugs,"view",true)) throw new Error("ACCESS_DENIED");
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) throw new Error("SHEETS_NOT_CONNECTED");
    const tabs = data.slugs.map(s=>TABS.find(t=>t.slug===s)!);
    const params = new URLSearchParams();
    tabs.forEach(t=>params.append("ranges",`'${t.title.replace(/'/g,"''")}'!A1:AL1000`));
    params.set("valueRenderOption","FORMATTED_VALUE");
    params.set("majorDimension","ROWS");
    const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${params}`,{
      method:"GET",headers:{Authorization:`Bearer ${lovableKey}`,"X-Connection-Api-Key":sheetsKey}
    });
    if (!res.ok) {
      console.error("Sheets read failed",res.status);
      throw new Error(`SHEETS_ERROR_${res.status}`);
    }
    const json = await res.json() as {valueRanges?: {values?:string[][]}[]};
    return {fetchedAt:Date.now(),tabs:tabs.map((t,i)=>({slug:t.slug,title:t.title,grid:json.valueRanges?.[i]?.values??[]}))};
  });

/** Second (read-only) sheet: daily document collection tabs, e.g. 29 میزان 1405. */
const DAILY_FORMS_SPREADSHEET_ID = "1VaYPi9P6Xnm2JKRVHc5rg_n-cwqZ1PXKGLVvObbYAck";
export type DailyFormsPayload = {
  tabName: string | null;
  date: string | null;
  ah2: string | null;
  cell: string | null;
  fetchedAt: number;
};
export const getDailyForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {cell?:string;nonce?:number})=>({cell:normalizeReferralCell(data?.cell??""),nonce:Number(data?.nonce)||0}))
  .handler(async ({ context,data }): Promise<DailyFormsPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!(await hasDashboardPermission(context,"dashboard","view"))) throw new Error("ACCESS_DENIED");
    const lovableKey=process.env["LOVABLE_API_KEY"];
    const sheetsKey=process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) throw new Error("SHEETS_NOT_CONNECTED");
    const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": sheetsKey };
    const metadataUrl=`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}?fields=sheets(properties(title))`;
    const metadataResponse=await fetch(metadataUrl,{method:"GET",headers});
    if (!metadataResponse.ok) throw new Error(`FORMS_SHEETS_ERROR_${metadataResponse.status}`);
    const metadata=await metadataResponse.json() as {sheets?:{properties?:{title?:string}}[]};
    const names=(metadata.sheets ?? []).map(s=>s.properties?.title).filter((x):x is string=>typeof x==="string");
    const match=selectDailyTab(names,todayJalali());
    if (!match) return {tabName:null,date:null,ah2:null,cell:null,fetchedAt:Date.now()};
    const escaped=match.name.replace(/'/g,"''");
    // Daily template changes merged cells and columns: detect the aggregate by its label.
    // Manual owner override is a validated A1 cell (A1:AZ20) in this same authorized tab.
    const range=encodeURIComponent(`'${escaped}'!A1:AZ20`);
    const response=await fetch(`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`,{method:"GET",headers,cache:"no-store"});
    if(!response.ok)throw new Error(`FORMS_SHEETS_ERROR_${response.status}`);
    const body=await response.json() as {values?:unknown[][]};
    const found=findReferralTotal(body.values??[],data.cell);
    if(!found)throw new Error("REFERRAL_CELL_NOT_FOUND");
    return {tabName:match.name,date:`${match.date.y}/${String(match.date.m).padStart(2,"0")}/${String(match.date.d).padStart(2,"0")}`,ah2:found.value,cell:found.cell,fetchedAt:Date.now()};
  });

/**
 * Daily registration coordination — G3:L3 is one merged cell, anchored at G3.
 * Source: جدول هماهنگی سال 1405. Read only; no modification to the source.
 */
const COORDINATION_SPREADSHEET_ID = "17XdiY4dWl_K5WbK1owVulYmglql1pI6Twe_2Io6ka_I";
export type DailyCoordinationPayload = {
  tabName: string | null;
  date: string | null;
  count: string | null;
  cell: string | null;
  fetchedAt: number;
};
export const getDailyCoordination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data:{cell?:string;nonce?:number})=>({cell:normalizeReferralCell(data?.cell??""),nonce:Number(data?.nonce)||0}))
  .handler(async ({ context,data }): Promise<DailyCoordinationPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!(await hasDashboardPermission(context,"dashboard","view"))) throw new Error("ACCESS_DENIED");
    const lovableKey=process.env["LOVABLE_API_KEY"];
    const sheetsKey=process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) throw new Error("SHEETS_NOT_CONNECTED");
    const headers={Authorization:`Bearer ${lovableKey}`,"X-Connection-Api-Key":sheetsKey};
    const metaResponse=await fetch(
      `${GATEWAY_URL}/spreadsheets/${COORDINATION_SPREADSHEET_ID}?fields=sheets(properties(title))`,
      {method:"GET",headers},
    );
    if (!metaResponse.ok) throw new Error(`COORDINATION_SHEETS_ERROR_${metaResponse.status}`);
    const meta=await metaResponse.json() as {sheets?:{properties?:{title?:string}}[]};
    const names=(meta.sheets??[]).map(s=>s.properties?.title).filter((x):x is string=>typeof x==="string");
    const match=selectTodayCoordinationTab(names,todayJalali()).today;
    if (!match) return {tabName:null,date:null,count:null,cell:null,fetchedAt:Date.now()};
    const escaped=match.name.replace(/'/g,"''");
    const range=encodeURIComponent(`'${escaped}'!A1:AZ20`);
    const response=await fetch(
      `${GATEWAY_URL}/spreadsheets/${COORDINATION_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
      {method:"GET",headers},
    );
    if (!response.ok) throw new Error(`COORDINATION_SHEETS_ERROR_${response.status}`);
    const body=await response.json() as {values?:unknown[][]};
    const chosen=data.cell||"G3";
    const {row,column}=cellIndex(chosen);
    const raw=body.values?.[row]?.[column];
    const count=raw===undefined||raw===null||String(raw).trim()==="" ? null : String(raw).trim();
    if(count!==null&&!/^[0-9۰-۹٠-٩٬, ]+$/.test(count))throw new Error("COORDINATION_CELL_NOT_NUMERIC");
    return {
      tabName:match.name,
      date:`${match.date.y}/${String(match.date.m).padStart(2,"0")}/${String(match.date.d).padStart(2,"0")}`,
      count,
      cell:chosen,
      fetchedAt:Date.now(),
    };
  });

/** Additional private report: registration/distribution/post-distribution monthly employee workbook.
 * The source is read-only. Each request checks the Afghan previous day, its month, and employee rows.
 * Separate connection grants may be required for this second Google Spreadsheet.
 */
const STAFF_REPORT_SPREADSHEET_ID = "1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8";
/** On Saturday review Thursday submissions; Friday is Afghanistan's weekly holiday. */
function completenessReviewDay(){
 const weekday=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"Asia/Kabul"}).format(new Date());
 if(weekday!=="Sat")return yesterdayJalali();
 const date=new Date(Date.now()-2*86400000);
 const parts=new Intl.DateTimeFormat("en-US-u-ca-persian",{timeZone:"Asia/Kabul",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(date);
 const n=(name:string)=>Number(parts.find(p=>p.type===name)?.value);
 return {y:n("year"),m:n("month"),d:n("day")};
}

export const getStaffDailyCompleteness = createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<StaffCompleteness>=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermission(context,"dashboard","view")))throw new Error("ACCESS_DENIED");
  const lovableKey=process.env["LOVABLE_API_KEY"];
  const sheetsKey=process.env["GOOGLE_SHEETS_API_KEY"];
  if(!lovableKey||!sheetsKey)throw new Error("SHEETS_NOT_CONNECTED");
  const headers={Authorization:`Bearer ${lovableKey}`,"X-Connection-Api-Key":sheetsKey};
  const yesterday=completenessReviewDay();
  const metadata=await fetch(`${GATEWAY_URL}/spreadsheets/${STAFF_REPORT_SPREADSHEET_ID}?fields=sheets(properties(title))`,{headers});
  if(!metadata.ok)throw new Error(`STAFF_SHEETS_ERROR_${metadata.status}`);
  const body=await metadata.json() as {sheets?:{properties?:{title?:string}}[]};
  const titles=(body.sheets??[]).map(t=>t.properties?.title).filter((x):x is string=>typeof x==="string");
  const month=findReportMonth(titles,yesterday.m);
  if(!month)return inspectStaffDay([],yesterday,"");
  const range=encodeURIComponent(`'${month.replace(/'/g,"''")}'!A1:AL100`);
  const resp=await fetch(`${GATEWAY_URL}/spreadsheets/${STAFF_REPORT_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,{headers});
  if(!resp.ok)throw new Error(`STAFF_SHEETS_ERROR_${resp.status}`);
  const data=await resp.json() as {values?:unknown[][]};
  const report=inspectStaffDay(data.values??[],yesterday,month);
  const isSaturday=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"Asia/Kabul"}).format(new Date())==="Sat";
  // Do not accuse staff of missing their reports on a regular Friday closure.
  if(isFridayJalali(yesterday) && report.submittedCount===0 && report.totalCount>0){
   return {...report,status:"nonwork",missing:[],message:"تېره ورځ جمعه وه؛ د رخصتۍ په ورځ د راپور نه ثبتېدل نیمګړتیا نه ګڼل کېږي."};
  }
  return isSaturday?{...report,message:`د پنجشنبې (${report.date}) د راپورونو ارزونه: ${report.message.replaceAll("د تېرې ورځې","د پنجشنبې ورځې")}`} :report;
 });

/** Second source for completion checking; independent of the registration report. */
const INSIJAM_SPREADSHEET_ID="1W82u37NeQ4Og7rANME6i3jxj1aeCZhhvIj3YtmopQ2g";
async function sheetsGet<T>(url:string,headers:Record<string,string>,errorCode:string):Promise<T>{
 const response=await fetch(url,{headers});
 if(!response.ok)throw new Error(`${errorCode}_${response.status}`);
 return response.json() as Promise<T>;
}
export const getInsijamDailyCompleteness=createServerFn({method:"GET"}).middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<StaffCompleteness>=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermission(context,"dashboard","view")))throw new Error("ACCESS_DENIED");
  const headers=sheetConnectionHeaders();
  const yesterday=completenessReviewDay();
  const meta=await sheetsGet<{sheets?:{properties?:{title?:string}}[]}>(`${GATEWAY_URL}/spreadsheets/${INSIJAM_SPREADSHEET_ID}?fields=sheets(properties(title))`,headers,"INSIJAM_SHEETS_ERROR");
  const titles=(meta.sheets??[]).map(x=>x.properties?.title).filter((x):x is string=>!!x);
  const month=findInsijamMonth(titles,yesterday.m,yesterday.y);
  if(!month)return inspectInsijamDay([],yesterday,"");
  const range=encodeURIComponent(`'${month.replace(/'/g,"''")}'!A1:AM90`);
  const data=await sheetsGet<{values?:unknown[][]}>(`${GATEWAY_URL}/spreadsheets/${INSIJAM_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,headers,"INSIJAM_SHEETS_ERROR");
  const report=inspectInsijamDay(data.values??[],yesterday,month);
  const isSaturday=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"Asia/Kabul"}).format(new Date())==="Sat";
  return isSaturday?{...report,message:`د پنجشنبې (${report.date}) د انسجام راپورونو ارزونه: ${report.message}`} :report;
 });
/** Copy-only output from the pre-existing read-only State Office tab. */
export const getStateReportForYesterday=createServerFn({method:"GET"}).middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<StateReport>=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermission(context,"dashboard","view")))throw new Error("ACCESS_DENIED");
  const headers=sheetConnectionHeaders();
  const day=completenessReviewDay();
  const range=encodeURIComponent("'ریاست ته ګزارش'!A1:AG75");
  const data=await sheetsGet<{values?:unknown[][]}>(`${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,headers,"STATE_REPORT_ERROR");
  return extractStateReport(data.values??[],day);
 });

/** Return at most 50 recent records per group to authorized center management, initially showing only five in the UI.
 * The full spreadsheets and patient data are never exposed to the browser.
 */
export const getRecentReferrals=createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<RecentReferrals>=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermission(context,"dashboard","view")))throw new Error("ACCESS_DENIED");
  const headers=sheetConnectionHeaders();
  const today=todayJalali();
  const intakeMeta=await sheetsGet<{sheets?:{properties?:{title?:string}}[]}>(`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}?fields=sheets(properties(title))`,headers,"FORMS_SHEETS_ERROR");
  const intakeTitles=(intakeMeta.sheets??[]).map(s=>s.properties?.title).filter((x):x is string=>!!x);
  const month=MONTH_NAMES[today.m]??"";
  const collection=intakeTitles.find(title=>
   title.includes(month)&&/جمع\s*آوری|جمع\s*اوری|جمع\s*آوري/.test(title)&&
   (title.includes(String(today.y))||title.includes("۱۴۰۵")));
  const intakeData=collection?await sheetsGet<{values?:unknown[][]}>(`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}/values/${encodeURIComponent(`'${collection.replace(/'/g,"''")}'!A1:H5000`)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,headers,"FORMS_SHEETS_ERROR"):{values:[] as unknown[][]};
  const newReferrals=newestCollectedPeople(intakeData.values??[],today,Number.POSITIVE_INFINITY);
  // Daily verification sheets are dated separately from the monthly intake sheet.
  // Never borrow yesterday's rejection reasons for today's intake records.
  const dailyVerification=selectTodayCoordinationTab(intakeTitles,today).today;
  let birthConfirmed=new Map<string,number>();
  let dailyApprovals=new Map<string,import("./birth-card-confirmations").DailyApproval>();
  let rejectedToday=new Map<string,string>();
  if(dailyVerification){
   try{
    const dailyGrid=await sheetsGet<{values?:unknown[][]}>(`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}/values/${encodeURIComponent(`'${dailyVerification.name.replace(/'/g,"''")}'!A1:AP600`)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,headers,"FORMS_SHEETS_ERROR");
    rejectedToday=extractRejectedFiles(dailyGrid.values??[]);
    birthConfirmed=birthCardConfirmations(dailyGrid.values??[]);
    dailyApprovals=dailyApprovalDetails(dailyGrid.values??[]);
    for(const person of newReferrals.people){
     const key=normalizeFileCode(person.fileCode);
     if(key&&dailyApprovals.has(key))person.dailyApproved=true;
     else if(key&&rejectedToday.has(key))person.rejectionReason=rejectedToday.get(key);
    }
   }catch{
    // Preserve intake list when verification sheet is unavailable; never guess a reason.
    console.error(`[recent-referrals] verification read failed for ${formatJ(today)}`);
   }
  }
  // Registration is read independently so a coordination-sheet failure never hides intake data.
  let coordinationTitles:string[]=[];
  let registrationGrid:unknown[][]=[];
  let registrationTarget:{name:string;date:JDate}|null=null;
  let registrationError:string|null=null;
  try{
   const coordinationMeta=await sheetsGet<{sheets?:{properties?:{title?:string}}[]}>(`${GATEWAY_URL}/spreadsheets/${COORDINATION_SPREADSHEET_ID}?fields=sheets(properties(title))`,headers,"COORDINATION_SHEETS_ERROR");
   coordinationTitles=(coordinationMeta.sheets??[]).map(s=>s.properties?.title).filter((x):x is string=>!!x);
   registrationTarget=selectTodayCoordinationTab(coordinationTitles,today).today;
   if(registrationTarget){
    const data=await sheetsGet<{values?:unknown[][]}>(`${GATEWAY_URL}/spreadsheets/${COORDINATION_SPREADSHEET_ID}/values/${encodeURIComponent(`'${registrationTarget.name.replace(/'/g,"''")}'!A1:Z400`)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,headers,"COORDINATION_SHEETS_ERROR");
    registrationGrid=data.values??[];
   }
  }catch(error){
   registrationError=error instanceof Error&&/^COORDINATION_SHEETS_ERROR_\d+$/.test(error.message)?error.message:"COORDINATION_SHEETS_ERROR";
   // Safe log: error code and Jalali date only, no sheet content.
   console.error(`[recent-referrals] registration read failed: ${registrationError} for ${formatJ(today)}`);
  }
  const registrationLoad=registrationTarget?{date:registrationTarget.date,grid:registrationGrid}:null;
  const registration=registrationError
   ?{date:null,people:[],source:null,diagnostic:{status:"fetch_error" as const,today:formatJ(today),todayTab:null,latestTab:null,latestDate:null,headerRow:null,groups:0,rowsScanned:0,sheetDateCell:null,errorCode:registrationError}}
   :newestRegisteredPeople(coordinationTitles,registrationLoad,today,Number.POSITIVE_INFINITY);
  // Match confirmed birth cards against the complete current-day intake section.
  // Only append to registration if not already present there, preventing double counting.
  const allIntake=collectedPeopleThroughDate(intakeData.values??[],today);
  const allRegistered=newestRegisteredPeople(coordinationTitles,registrationLoad,today,Number.POSITIVE_INFINITY).people;
  const confirmedPeople=allIntake.filter(person=>{
   const code=normalizeFileCode(person.fileCode);
   return !!code&&birthConfirmed.has(code)&&(!rejectedToday.has(code)||dailyApprovals.has(code));
  });
  const uniqueCodes=new Set<string>();
  // The file code is authoritative for a birth-card confirmation. A fuzzy name
  // match must never silently suppress the confirmed entry (e.g. file 18705).
  // Deduplicate only when the ordinary registration record carries that same code.
  const registeredCodes=new Set(allRegistered.map(p=>normalizeFileCode(p.fileCode)).filter(Boolean));
  const extraConfirmed=confirmedPeople.filter(person=>{
   const code=normalizeFileCode(person.fileCode);
   if(!code||uniqueCodes.has(code))return false;
   uniqueCodes.add(code);
   if(registeredCodes.has(code)){
    for(const existing of allRegistered){
     if(normalizeFileCode(existing.fileCode)===code){
      existing.birthCardConfirmed=true;
      existing.team="ثبت تولد";
     }
    }
    return false;
   }
   return true;
  }).map(person=>({...person,sourceTab:dailyVerification?.name??null,sourceDate:formatJ(today),birthCardConfirmed:true,team:"ثبت تولد",familyMembers:birthConfirmed.get(normalizeFileCode(person.fileCode))??person.familyMembers}));
  for(const person of newReferrals.people){
   const code=normalizeFileCode(person.fileCode);
   if(code&&birthConfirmed.has(code)&&!person.rejectionReason)person.birthCardConfirmed=true;
  }
  // Daily registration sheet does not provide a shared event timestamp with birth-card
  // confirmations. Interleave both streams instead of always pinning birth-card cases
  // to the beginning; preserve the existing order within each stream.
  const mergeRegistrationKinds=<T,>(ordinary:T[],birth:T[]):T[]=>{
   const mixed:T[]=[];
   let i=0,j=0;
   while(i<ordinary.length||j<birth.length){
    if(i<ordinary.length)mixed.push(ordinary[i++]!);
    if(j<birth.length)mixed.push(birth[j++]!);
   }
   return mixed;
  };
  if(extraConfirmed.length){
   registration.people=mergeRegistrationKinds(registration.people,extraConfirmed);
  }
  // Carry the birth-card label to the visible registration rows even when a
  // matching ordinary row was already present in the daily registration sheet.
  for(const person of registration.people){
   const matched=allRegistered.find(r=>matchesRegisteredPerson(person,[r])&&r.birthCardConfirmed);
   if(matched){person.birthCardConfirmed=true;person.team="ثبت تولد";person.fileCode=matched.fileCode;}
  }
  const birthCardAddedCount=extraConfirmed.reduce((sum,p)=>sum+(p.familyMembers??0),0);
  // Server-only full daily collections: no full person lists are returned to the browser.
  const fullGroups={
    newReferrals:{...newReferrals,source:collection??null},
    registration:{...newestRegisteredPeople(coordinationTitles,registrationLoad,today,Number.POSITIVE_INFINITY),people:mergeRegistrationKinds(allRegistered,extraConfirmed)},
    fetchedAt:Date.now()
  };
  const watchList = await hasDashboardPermission(context,"problem-visitors")
    ? (await loadProblemVisitors(context,true)).visitors : [];
  const matches=findPotentialProblemMatches(watchList,fullGroups);
  const matchHistorySaved = await rememberProblemMatches(context.userId, matches);
  return {
    matchHistorySaved,
    newReferrals:{...newReferrals,source:collection??null},registration,teamCounts:registrationTeamCounts(registrationGrid),birthCardAddedCount,fetchedAt:Date.now(),
    potentialMatches:matches.map(m=>({key:matchRecordKey(m.key),visitorId:m.visitor.id,fullName:m.visitor.full_name,fatherName:m.visitor.father_name,section:m.record.section,date:m.record.date}))
  };
 });

export const getHistoricalReferrals=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:{from:string;to:string})=>{
  const from=parseJalali(input?.from??""),to=parseJalali(input?.to??"");
  if(!from||!to||jKey(from)>jKey(to)||(to.y-from.y)*12+to.m-from.m>2)throw new Error("HISTORICAL_RANGE_MAX_THREE_MONTHS");
  return {from,to};
 })
 .handler(async({data,context})=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermission(context,"dashboard","view")))throw new Error("ACCESS_DENIED");
  const headers=sheetConnectionHeaders();
  const {from,to}=data;
  const meta=await sheetsGet<{sheets?:{properties?:{title?:string}}[]}>(GATEWAY_URL+"/spreadsheets/"+DAILY_FORMS_SPREADSHEET_ID+"?fields=sheets(properties(title))",headers,"FORMS_SHEETS_ERROR");
  const titles=(meta.sheets??[]).map(x=>x.properties?.title).filter((x):x is string=>!!x);
  const months:{y:number;m:number}[]=[];
  for(let y=from.y,m=from.m;y<to.y||(y===to.y&&m<=to.m);){months.push({y,m});m++;if(m>12){m=1;y++;}}
  const intake:import("./recent-referrals").RecentReferral[]=[];
  const usedTabs:string[]=[];
  for(const item of months){
   const month=MONTH_NAMES[item.m]??"";
   const tab=titles.find(t=>t.includes(month)&&/جمع\s*آوری|جمع\s*اوری|جمع\s*آوري/.test(t)&&(t.includes(String(item.y))||t.includes(String(item.y).replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹".charAt(Number(d))))));
   if(!tab)continue;
   usedTabs.push(tab);
   const path="'"+tab.replace(/'/g,"''")+"'!A1:H5000";
   const collection=await sheetsGet<{values?:unknown[][]}>(GATEWAY_URL+"/spreadsheets/"+DAILY_FORMS_SPREADSHEET_ID+"/values/"+encodeURIComponent(path)+"?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS",headers,"FORMS_SHEETS_ERROR");
   intake.push(...collectedPeopleInRange(collection.values??[],from,to).map(p=>({...p,sourceTab:tab,sourceDate:p.recordKey?.split(":")[0]??null})));
  }
  if(usedTabs.length!==months.length)throw new Error("HISTORICAL_INTAKE_MONTH_MISSING");
  const regMeta=await sheetsGet<{sheets?:{properties?:{title?:string}}[]}>(GATEWAY_URL+"/spreadsheets/"+COORDINATION_SPREADSHEET_ID+"?fields=sheets(properties(title))",headers,"COORDINATION_SHEETS_ERROR");
  const regTitles=(regMeta.sheets??[]).map(x=>x.properties?.title).filter((x):x is string=>!!x);
  const regDays=regTitles.map(name=>({name,date:parseCoordinationTabDate(name,to.y)})).filter((x):x is {name:string;date:JDate}=>!!x.date&&jKey(x.date)>=jKey(from)&&jKey(x.date)<=jKey(to));
  if(regDays.length>93)throw new Error("HISTORICAL_RANGE_TOO_LARGE");
  const registration:import("./recent-referrals").RecentReferral[]=[];
  const teamCounts:[number,number,number,number]=[0,0,0,0];
  for(const day of regDays){
   const tabPath="'"+day.name.replace(/'/g,"''")+"'!A1:Z400";
   const result=await sheetsGet<{values?:unknown[][]}>(GATEWAY_URL+"/spreadsheets/"+COORDINATION_SPREADSHEET_ID+"/values/"+encodeURIComponent(tabPath)+"?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS",headers,"COORDINATION_SHEETS_ERROR");
   const grid=result.values??[];
   const group=newestRegisteredPeople([day.name],{date:day.date,grid},day.date,Number.POSITIVE_INFINITY);
   registration.push(...group.people.map(p=>({...p,sourceTab:day.name,sourceDate:formatJ(day.date)})));
   const counts=registrationTeamCounts(grid);
   counts.forEach((n,i)=>{teamCounts[i]=(teamCounts[i]??0)+n;});
  }
  const result = {matchHistorySaved:true,newReferrals:{date:formatJ(from)+" — "+formatJ(to),people:intake,source:usedTabs.join("، ")||null},
   registration:{date:formatJ(from)+" — "+formatJ(to),people:registration,source:null},
   teamCounts,birthCardAddedCount:0,fetchedAt:Date.now(),historical:true};
  if (await hasDashboardPermission(context, "problem-visitors")) {
    const { visitors } = await loadProblemVisitors(context, true);
    const matches = findPotentialProblemMatches(visitors, result);
    result.matchHistorySaved = await rememberProblemMatches(context.userId, matches);
  }
  return result;
 });

/** Read complete visitor workbooks independently of the dashboard's daily summary. */
export const scanVisitorArchive = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((input:{book:number;offset:number})=>{
   if(![0,1].includes(input?.book)||!Number.isSafeInteger(input.offset)||input.offset<0)throw new Error("INVALID_ARCHIVE_PAGE");
   return input;
 }).handler(async({data,context})=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!(await hasDashboardPermissions(context,["dashboard","problem-visitors"])))throw new Error("ACCESS_DENIED");
  const {readVisitorRows}=await import("./problem-visitor-sheet.server");
  const visitors=await readVisitorRows(context,true);
  if(!visitors.length)return {next:null,scanned:0};
  const {archivePeople}=await import("./visitor-archive");
  const {normalizedPerson}=await import("./problem-visitor-matching");
  const headers=sheetConnectionHeaders();
  const url=GATEWAY_URL+"/spreadsheets/"+[DAILY_FORMS_SPREADSHEET_ID,COORDINATION_SPREADSHEET_ID][data.book];
  const metadata=await sheetsGet<{sheets:{properties:{title:string}}[]}>(url+"?fields=sheets(properties(title))",headers,"ARCHIVE_METADATA");
  const titles=metadata.sheets.map(s=>s.properties.title).filter(t=>normalizedPerson(t)!==normalizedPerson("مراجعین مشکلاتی")).sort();
  const batch=titles.slice(data.offset,data.offset+6);
  if(batch.length){
    const query=new URLSearchParams();
    batch.forEach(t=>query.append("ranges","'"+t.replace(/'/g,"''")+"'"));
    const response=await sheetsGet<{valueRanges:{values?:string[][]}[]}>(url+"/values:batchGet?"+query,headers,"ARCHIVE_READ");
    if(response.valueRanges.length!==batch.length)throw new Error("ARCHIVE_INCOMPLETE");
    for(const [i,title] of batch.entries()){
      const people=archivePeople(title,response.valueRanges[i]?.values??[],todayJalali(),data.book===1);
      const group={date:null,source:title,people},empty={date:null,source:null,people:[]};
      const matches=findPotentialProblemMatches(visitors,{newReferrals:data.book===0?group:empty,registration:data.book===1?group:empty,fetchedAt:Date.now()});
      if(!await rememberProblemMatches(context.userId,matches))throw new Error("ARCHIVE_SAVE");
    }
  }
  const offset=data.offset+batch.length;
  const next=offset<titles.length?{book:data.book,offset}:data.book===0?{book:1,offset:0}:null;
  return {next,scanned:batch.length};
 });
