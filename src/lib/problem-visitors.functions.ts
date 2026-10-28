import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";

export type ProblemVisitor = { id:string; full_name:string; father_name:string; issue:string; status:"active"|"resolved"; created_at:string };
type Command = {action:"add";full_name:string;father_name:string;issue:string} | {action:"status";id:string;status:"active"|"resolved"} | {action:"delete";id:string};
function verify(context:{claims:unknown}) {
 const claims=context.claims as {email?:string}|null;
 if(!isEmailAllowed(claims?.email??null,process.env["OWNER_EMAILS"])) throw new Error("ACCESS_DENIED");
}
export const getProblemVisitors=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context}):Promise<ProblemVisitor[]>=>{
 setResponseHeader("Cache-Control","private, no-store");verify(context);
 const db=context.supabase as unknown as SupabaseClient;
 const {data,error}=await db.from("problem_visitors").select("id,full_name,father_name,issue,status,created_at").eq("user_id",context.userId).order("created_at",{ascending:false}).limit(500);
 if(error)throw new Error("PROBLEM_VISITORS_READ_FAILED");
 return data as ProblemVisitor[];
});
export const changeProblemVisitor=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((data:Command)=>{
  if(!data || !["add","status","delete"].includes(data.action))throw new Error("INVALID_REQUEST");
  if(data.action==="add" && (![data.full_name,data.father_name,data.issue].every(v=>typeof v==="string") || data.full_name.trim().length<2 || data.full_name.length>180 || data.father_name.trim().length<2 || data.father_name.length>180 || data.issue.trim().length<3 || data.issue.length>2000))throw new Error("INVALID_REQUEST");
  if(data.action!=="add"&&!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(data.id))throw new Error("INVALID_REQUEST");
  if(data.action==="status"&&!["active","resolved"].includes(data.status))throw new Error("INVALID_REQUEST");
  return data;
 }).handler(async({data,context})=>{
  setResponseHeader("Cache-Control","private, no-store");verify(context);
  const db=context.supabase as unknown as SupabaseClient;
  if(data.action==="add"){
   const {error}=await db.from("problem_visitors").insert({user_id:context.userId,full_name:data.full_name.trim(),father_name:data.father_name.trim(),issue:data.issue.trim()});
   if(error)throw new Error("PROBLEM_VISITORS_WRITE_FAILED");
  } else if(data.action==="status"){
   const {error}=await db.from("problem_visitors").update({status:data.status,updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
   if(error)throw new Error("PROBLEM_VISITORS_WRITE_FAILED");
  } else {
   const {error}=await db.from("problem_visitors").delete().eq("id",data.id).eq("user_id",context.userId);
   if(error)throw new Error("PROBLEM_VISITORS_WRITE_FAILED");
  }
  return {ok:true};
 });
