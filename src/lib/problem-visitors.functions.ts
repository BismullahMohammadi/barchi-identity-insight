import { loadProblemVisitors } from "./problem-visitor-sheet.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDashboardPermission } from "./dashboard-permissions.server";

export type ProblemVisitor = { id:string; full_name:string; father_name:string; issue:string; status:"active"|"resolved"; created_at:string };
type Command = {action:"add";full_name:string;father_name:string;issue:string} | {action:"status";id:string;status:"active"|"resolved"} | {action:"delete";id:string};
export const getProblemVisitors=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 setResponseHeader("Cache-Control","private, no-store");
 return loadProblemVisitors(context);
});
export const changeProblemVisitor=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((data:Command)=>{
  if(!data || !["add","status","delete"].includes(data.action))throw new Error("INVALID_REQUEST");
  if(data.action==="add" && (![data.full_name,data.father_name,data.issue].every(v=>typeof v==="string") || data.full_name.trim().length<2 || data.full_name.length>180 || data.father_name.trim().length<2 || data.father_name.length>180 || data.issue.trim().length<3 || data.issue.length>2000))throw new Error("INVALID_REQUEST");
  if(data.action!=="add"&&!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(data.id))throw new Error("INVALID_REQUEST");
  if(data.action==="status"&&!["active","resolved"].includes(data.status))throw new Error("INVALID_REQUEST");
  return data;
 }).handler(async({data,context})=>{
  setResponseHeader("Cache-Control","private, no-store");await requireDashboardPermission(context,"problem-visitors",data.action==="add"?"create":data.action==="status"?"edit":"delete");
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
