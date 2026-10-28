import {createServerFn} from "@tanstack/react-start";
import {setResponseHeader} from "@tanstack/react-start/server";
import {createClient} from "@supabase/supabase-js";
import {requireSupabaseAuth} from "@/integrations/supabase/auth-middleware";
import {isEmailAllowed} from "./access";
import {yesterdayJalali,formatJ} from "./jalali";
import type {StaffCompleteness} from "./monthly-staff-completeness";

export type DailyCheck={report_date:string;checked_at:string;status:"complete"|"incomplete"|"unavailable"|"nonwork";
 missing_count:number;registration:StaffCompleteness|null;insijam:StaffCompleteness|null;error_text:string|null};
export const getScheduledDailyCheck=createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<DailyCheck|null>=>{
  setResponseHeader("Cache-Control","private, no-store");
  const claims=context.claims as {email?:string}|null;
  if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"]))throw new Error("ACCESS_DENIED");
  const url=process.env["SUPABASE_URL"],serviceRole=process.env["SCHEDULE_SUPABASE_SERVICE_ROLE_KEY"];
  // If the deployment key has not yet been configured, return no status.
  if(!url||!serviceRole)return null;
  const db=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const date=formatJ(yesterdayJalali());
  const {data,error}=await db.from("daily_report_checks")
   .select("report_date,checked_at,status,missing_count,registration,insijam,error_text")
   .eq("report_date",date).maybeSingle();
  if(error)throw new Error("SCHEDULED_CHECK_READ_FAILED");
  return data as DailyCheck|null;
 });
