import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import { SPREADSHEET_ID } from "./tabs";

export type MonthlyDieselRecord={
  code:string;startDate:string;endDate:string;month:string;
  hours:number|null;litersPerHour:number|null;consumedLiters:number|null;
  document:string;previousHours:number|null;
};
export type MonthlyDieselReport={records:MonthlyDieselRecord[];fetchedAt:number;source:"مصرف دیزل"};
const numeric=(value:unknown):number|null=>{
 const text=String(value??"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[,٬\s]/g,"");
 if(!text)return null;const n=Number(text);return Number.isFinite(n)&&n>=0?n:null;
};
export function parseDieselSheet(rows:unknown[][]):MonthlyDieselRecord[]{
 return rows.slice(4).filter(row=>/^14\d{2}--\d{2}$/.test(String(row[0]??"").trim())&&String(row[3]??"").trim()!=="")
 .map(row=>{
  const hours=numeric(row[4]),rate=numeric(row[5]),rawConsumption=numeric(row[6]);
  // Future prefilled zeroes without hours or rate are placeholders, not verified consumption.
  const consumedLiters=rawConsumption===0&&hours===null&&rate===null?null:rawConsumption;
  return {code:String(row[0]).trim(),startDate:String(row[1]??"").trim(),endDate:String(row[2]??"").trim(),month:String(row[3]).trim(),
   hours,litersPerHour:rate,consumedLiters,document:String(row[7]??"").trim(),previousHours:numeric(row[8])};
 });
}
export const getDieselSheetReport=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context}):Promise<MonthlyDieselReport>=>{
 setResponseHeader("Cache-Control","private, no-store");
 const claims=context.claims as {email?:string}|null;
 if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"]))throw new Error("ACCESS_DENIED");
 const lovable=process.env["LOVABLE_API_KEY"],key=process.env["GOOGLE_SHEETS_API_KEY"];
 if(!lovable||!key)throw new Error("SHEETS_NOT_CONNECTED");
 const range=encodeURIComponent("'مصرف دیزل'!A1:I50");
 const url=`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`;
 const res=await fetch(url,{headers:{Authorization:`Bearer ${lovable}`,"X-Connection-Api-Key":key}});
 if(!res.ok)throw new Error("DIESEL_SHEET_ERROR_"+res.status);
 const json=await res.json() as {values?:unknown[][]};
 return {source:"مصرف دیزل",records:parseDieselSheet(json.values??[]),fetchedAt:Date.now()};
});
