import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import { SPREADSHEET_ID, TABS } from "./tabs";
import { todayJalali } from "./jalali";
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
