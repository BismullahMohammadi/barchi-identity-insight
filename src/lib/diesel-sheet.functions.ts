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
export type DieselDelivery={code:string;sequence:string;date:string;liters:number;unitPrice:number|null;totalAmount:number|null;document:string;remaining:string;note:string;isCarryover:boolean};
export type DieselReconciliation={sheetHours:number|null;sheetConsumed:number|null;sheetDelivered:number|null;sheetDifference:number|null;physicalStock:number|null;physicalStockDate:string|null;deliveryAmountError:boolean};
export type MonthlyDieselReport={records:MonthlyDieselRecord[];deliveries:DieselDelivery[];reconciliation:DieselReconciliation;fetchedAt:number;source:"مصرف دیزل"};
const numeric=(value:unknown):number|null=>{
 const text=String(value??"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[,٬\s]/g,"");
 if(!text)return null;const n=Number(text);return Number.isFinite(n)&&n>=0?n:null;
};
export function parseDieselSheet(rows:unknown[][]):MonthlyDieselRecord[]{
 return rows.slice(4).filter(row=>/^14\d{2}--\d{2}$/.test(String(row[0]??"").trim())&&/^(حمل|ثور|جوزا|سرطان|اسد|سنبله|میزان|عقرب|قوس|جدی|دلو|حوت)$/.test(String(row[3]??"").trim()))
 .map(row=>{
  const hours=numeric(row[4]),rate=numeric(row[5]),rawConsumption=numeric(row[6]);
  // Future prefilled zeroes without hours or rate are placeholders, not verified consumption.
  const consumedLiters=rawConsumption===0&&hours===null&&rate===null?null:rawConsumption;
  return {code:String(row[0]).trim(),startDate:String(row[1]??"").trim(),endDate:String(row[2]??"").trim(),month:String(row[3]).trim(),
   hours,litersPerHour:rate,consumedLiters,document:String(row[7]??"").trim(),previousHours:numeric(row[8])};
 });
}
export function parseDieselDeliveries(rows:unknown[][]):DieselDelivery[]{
 const headerIndex=rows.findIndex(row=>String(row[1]??"").trim()==="ګڼه"&&String(row[3]??"").includes("ډیزل"));
 if(headerIndex<0)return [];
 return rows.slice(headerIndex+1).filter(row=>{
  const sequence=String(row[1]??"").trim();
  return /^[0-9]+$/.test(sequence)&&numeric(row[3])!==null&&Number(numeric(row[3]))>0;
 }).map(row=>({
  code:String(row[0]??"").trim(),sequence:String(row[1]??"").trim(),date:String(row[2]??"").trim(),
  liters:numeric(row[3])!,unitPrice:numeric(row[4]),totalAmount:numeric(row[5]),
  document:String(row[6]??"").trim(),remaining:String(row[7]??"").trim(),note:String(row[8]??"").trim(),
  isCarryover:String(row[2]??"").trim()==="1404"||String(row[8]??"").includes("1404 کال پاتې")
 }));
}
export function parseDieselReconciliation(rows:unknown[][]):DieselReconciliation{
 const consumptionRow=rows.find(row=>String(row[1]??"").trim()==="مجموعه");
 const deliveredRow=rows.find(row=>String(row[1]??"").trim()==="جمله");
 const differenceRow=rows.find(row=>String(row[1]??"").includes("په اداره باندې پاتې"));
 const physical=rows.flatMap(row=>row.map(cell=>String(cell??""))).find(x=>x.includes("موجودي ترسره شوه")&&x.includes("لیتره"))??"";
 const physicalValue=physical.match(/([0-9]+(?:[.٫][0-9]+)?)\s*لیتره/);
 const physicalDate=physical.match(/14[0-9]{2}\s*\/\s*[0-9]{1,2}\s*\/\s*[0-9]{1,2}/);
 return {sheetHours:numeric(consumptionRow?.[4]),sheetConsumed:numeric(consumptionRow?.[6]),
  sheetDelivered:numeric(deliveredRow?.[3]),sheetDifference:typeof differenceRow?.[4]==="number"?differenceRow[4] as number:null,
  physicalStock:physicalValue?numeric(physicalValue[1]?.replace("٫",".")):null,
  physicalStockDate:physicalDate?.[0]??null,deliveryAmountError:rows.some(row=>row.some(cell=>String(cell)==="#VALUE!"))};
}
export const getDieselSheetReport=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context}):Promise<MonthlyDieselReport>=>{
 setResponseHeader("Cache-Control","private, no-store");
 const claims=context.claims as {email?:string}|null;
 if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"]))throw new Error("ACCESS_DENIED");
 const lovable=process.env["LOVABLE_API_KEY"],key=process.env["GOOGLE_SHEETS_API_KEY"];
 if(!lovable||!key)throw new Error("SHEETS_NOT_CONNECTED");
 const range=encodeURIComponent("'مصرف دیزل'!A1:I250");
 const url=`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`;
 const res=await fetch(url,{headers:{Authorization:`Bearer ${lovable}`,"X-Connection-Api-Key":key}});
 if(!res.ok)throw new Error("DIESEL_SHEET_ERROR_"+res.status);
 const json=await res.json() as {values?:unknown[][]};
 return {source:"مصرف دیزل",records:parseDieselSheet(json.values??[]),deliveries:parseDieselDeliveries(json.values??[]),reconciliation:parseDieselReconciliation(json.values??[]),fetchedAt:Date.now()};
});
