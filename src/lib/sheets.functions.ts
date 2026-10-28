import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import { SPREADSHEET_ID, TABS } from "./tabs";
import { todayJalali, yesterdayJalali } from "./jalali";
import { findReportMonth, inspectStaffDay, type StaffCompleteness } from "./monthly-staff-completeness";
import { selectDailyTab } from "./daily-forms";

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
    return { email, allowed: ownerAuthorized(context.claims), allowlistConfigured: !!process.env["OWNER_EMAILS"]?.trim() };
  });
export type SheetPayload = { fetchedAt: number; tabs: {slug:string;title:string;grid:string[][]}[] };
export const getSheetTabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {slugs: string[]}) => {
    if (!input || !Array.isArray(input.slugs) || !input.slugs.length || input.slugs.length > 12 || new Set(input.slugs).size !== input.slugs.length || input.slugs.some(s=>!TABS.some(t=>t.slug===s))) throw new Error("Invalid tabs");
    return {slugs:input.slugs};
  })
  .handler(async ({data,context}):Promise<SheetPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!ownerAuthorized(context.claims)) throw new Error("ACCESS_DENIED");
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
  fetchedAt: number;
};
export const getDailyForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyFormsPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!ownerAuthorized(context.claims)) throw new Error("ACCESS_DENIED");
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
    if (!match) return {tabName:null,date:null,ah2:null,fetchedAt:Date.now()};
    const escaped=match.name.replace(/'/g,"''");
    // AH2:AI2 is one merged cell; Google Sheets stores its value in AH2 only.
    const range=encodeURIComponent(`'${escaped}'!AH2`);
    const response=await fetch(`${GATEWAY_URL}/spreadsheets/${DAILY_FORMS_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`,{method:"GET",headers});
    if (!response.ok) throw new Error(`FORMS_SHEETS_ERROR_${response.status}`);
    const body=await response.json() as {values?:unknown[][]};
    const row=body.values?.[0] ?? [];
    const value=(i:number):string|null=>row[i]==null||String(row[i]).trim()===""?null:String(row[i]).trim();
    return {tabName:match.name,date:`${match.date.y}/${String(match.date.m).padStart(2,"0")}/${String(match.date.d).padStart(2,"0")}`,ah2:value(0),fetchedAt:Date.now()};
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
  fetchedAt: number;
};
export const getDailyCoordination = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyCoordinationPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    if (!ownerAuthorized(context.claims)) throw new Error("ACCESS_DENIED");
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
    const match=selectDailyTab(names,todayJalali());
    if (!match) return {tabName:null,date:null,count:null,fetchedAt:Date.now()};
    const escaped=match.name.replace(/'/g,"''");
    const range=encodeURIComponent(`'${escaped}'!G3`);
    const response=await fetch(
      `${GATEWAY_URL}/spreadsheets/${COORDINATION_SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
      {method:"GET",headers},
    );
    if (!response.ok) throw new Error(`COORDINATION_SHEETS_ERROR_${response.status}`);
    const data=await response.json() as {values?:unknown[][]};
    const raw=data.values?.[0]?.[0];
    const count=raw===undefined||raw===null||String(raw).trim()==="" ? null : String(raw).trim();
    return {
      tabName:match.name,
      date:`${match.date.y}/${String(match.date.m).padStart(2,"0")}/${String(match.date.d).padStart(2,"0")}`,
      count,
      fetchedAt:Date.now(),
    };
  });

/** Additional private report: registration/distribution/post-distribution monthly employee workbook.
 * The source is read-only. Each request checks the Afghan previous day, its month, and employee rows.
 * Separate connection grants may be required for this second Google Spreadsheet.
 */
const STAFF_REPORT_SPREADSHEET_ID = "1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8";
export const getStaffDailyCompleteness = createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<StaffCompleteness>=>{
  setResponseHeader("Cache-Control","private, no-store");
  if(!ownerAuthorized(context.claims))throw new Error("ACCESS_DENIED");
  const lovableKey=process.env["LOVABLE_API_KEY"];
  const sheetsKey=process.env["GOOGLE_SHEETS_API_KEY"];
  if(!lovableKey||!sheetsKey)throw new Error("SHEETS_NOT_CONNECTED");
  const headers={Authorization:`Bearer ${lovableKey}`,"X-Connection-Api-Key":sheetsKey};
  const yesterday=yesterdayJalali();
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
  const prevGregorian=new Date(Date.now()-86_400_000);
  const weekday=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"Asia/Kabul"}).format(prevGregorian);
  // Do not accuse staff of missing their reports on a regular Friday closure.
  if(weekday==="Fri" && report.submittedCount===0 && report.totalCount>0){
   return {...report,status:"nonwork",missing:[],message:"پرون جمعه وه؛ د رخصتۍ په ورځ د راپور نه ثبتېدل نیمګړتیا نه ګڼل کېږي."};
  }
  return report;
 });
