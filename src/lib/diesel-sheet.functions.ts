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
export const getDieselSheetReport=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((x:{nonce:number})=>{if(!Number.isFinite(x?.nonce))throw new Error("INVALID_REFRESH");return x;}).handler(async({context}):Promise<MonthlyDieselReport>=>{
 setResponseHeader("Cache-Control","private, no-store");
 const claims=context.claims as {email?:string}|null;
 if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"]))throw new Error("ACCESS_DENIED");
 const lovable=process.env["LOVABLE_API_KEY"],key=process.env["GOOGLE_SHEETS_API_KEY"];
 if(!lovable||!key)throw new Error("SHEETS_NOT_CONNECTED");
 const params=new URLSearchParams();
 params.append("ranges","'مصرف دیزل'!A1:I250");
 params.set("valueRenderOption","UNFORMATTED_VALUE");
 params.set("majorDimension","ROWS");
 let res:Response;
 try{res=await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${params}`,{headers:{Authorization:`Bearer ${lovable}`,"X-Connection-Api-Key":key},cache:"no-store"});}
 catch{throw new Error("DIESEL_NETWORK_FAILED");}
 if(!res.ok)throw new Error("DIESEL_SHEET_ERROR_"+res.status);
 const json=await res.json() as {valueRanges?:{values?:unknown[][]}[]};
 const rows=json.valueRanges?.[0]?.values;
 if(!rows?.length)throw new Error("DIESEL_SHEET_EMPTY");
 // UNFORMATTED_VALUE can turn date-formatted cells into Sheets serial numbers.
 // Fetch visible dates separately, retaining raw numeric values for accurate consumption.
 const formattedParams=new URLSearchParams(params);
 formattedParams.set("valueRenderOption","FORMATTED_VALUE");
 const formattedResponse=await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${formattedParams}`,{headers:{Authorization:`Bearer ${lovable}`,"X-Connection-Api-Key":key},cache:"no-store"});
 if(!formattedResponse.ok)throw new Error("DIESEL_DATES_ERROR_"+formattedResponse.status);
 const formatted=await formattedResponse.json() as {valueRanges?:{values?:unknown[][]}[]};
 const shown=formatted.valueRanges?.[0]?.values??[];
 for(let i=0;i<rows.length;i++){
  const display=shown[i];
  if(!display)continue;
  // Dates in delivery table are column C, and in consumption table B/C.
  // Preserve formatted strings only for dates; exact decimals remain numeric.
  for(const col of [1,2])if(display[col]!=null&&rows[i])rows[i]![col]=display[col];
 }

 const records=parseDieselSheet(rows),deliveries=parseDieselDeliveries(rows);
 if(!records.length||!deliveries.length)throw new Error("DIESEL_SHEET_FORMAT_CHANGED");
 return {source:"مصرف دیزل",records,deliveries,reconciliation:parseDieselReconciliation(rows),fetchedAt:Date.now()};
});
