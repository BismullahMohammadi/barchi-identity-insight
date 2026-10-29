import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
export type FuelEntry={id:string;entry_date:string;kind:"opening"|"received"|"used";liters:number;reference_no:string|null;supplier:string|null;generator_hours:number|null;note:string|null;created_at:string};
type FuelInput={kind:FuelEntry["kind"];liters:number;entry_date:string;reference_no?:string;supplier?:string;generator_hours?:number|null;note?:string};
function authorize(context:{claims:unknown}){const claims=context.claims as {email?:string}|null;if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"]))throw new Error("ACCESS_DENIED");}
export const getFuelEntries=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context}):Promise<FuelEntry[]>=>{
 setResponseHeader("Cache-Control","private, no-store");authorize(context);
 const db=context.supabase as unknown as SupabaseClient;
 const {data,error}=await db.from("fuel_entries").select("id,entry_date,kind,liters,reference_no,supplier,generator_hours,note,created_at").eq("user_id",context.userId).order("created_at",{ascending:false}).limit(2000);
 if(error)throw new Error("FUEL_READ_FAILED");
 return (data??[]).map(x=>({...x,liters:Number(x.liters),generator_hours:x.generator_hours===null?null:Number(x.generator_hours)})) as FuelEntry[];
});
export const addFuelEntry=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.inputValidator((x:FuelInput)=>{
 if(!x||!["opening","received","used"].includes(x.kind)||typeof x.liters!=="number"||!Number.isFinite(x.liters)||x.liters<=0||x.liters>100000||!/^\d{4}-\d{2}-\d{2}$/.test(x.entry_date)||String(x.reference_no??"").length>120||String(x.supplier??"").length>180||String(x.note??"").length>2000||x.generator_hours!=null&&(!Number.isFinite(x.generator_hours)||x.generator_hours<0||x.generator_hours>100000))throw new Error("INVALID_FUEL_ENTRY");
 return x;
}).handler(async({context,data})=>{
 setResponseHeader("Cache-Control","private, no-store");authorize(context);
 const db=context.supabase as unknown as SupabaseClient;
 const {error}=await db.rpc("add_fuel_entry",{p_kind:data.kind,p_liters:data.liters,p_date:data.entry_date,p_reference:data.reference_no??null,p_supplier:data.supplier??null,p_hours:data.generator_hours??null,p_note:data.note??null});
 if(error){if(error.message.includes("INSUFFICIENT_FUEL"))throw new Error("INSUFFICIENT_FUEL");throw new Error("FUEL_WRITE_FAILED");}
 return {ok:true};
});
