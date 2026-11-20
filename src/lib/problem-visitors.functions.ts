import { loadProblemVisitors } from "./problem-visitor-sheet.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDashboardPermission } from "./dashboard-permissions.server";

export type ProblemVisitor = { id:string; full_name:string; father_name:string; issue:string; status:"active"|"resolved"; first_matched_at?: string | null; created_at:string };
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

export type MatchDetail = {
 name:string; father:string; section:"intake"|"registration"; date:string|null; sheet:string|null;
 familyMembers:number|null; fileCode:string|null; team:string|null; confidence:"normalized-exact"|"possible";
};
export const getProblemMatchDetails = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((id:string)=>{
   if(typeof id!=="string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))throw new Error("INVALID_REQUEST");
   return id;
 }).handler(async({data:id,context})=>{
   setResponseHeader("Cache-Control","private, no-store");
   await requireDashboardPermission(context,"problem-visitors");
   await requireDashboardPermission(context,"dashboard");
   const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
   const db=supabaseAdmin as unknown as SupabaseClient;
   const details: MatchDetail[]=[];
   for(let offset=0;;offset+=200){
     const {data,error}=await db.from("problem_match_details")
       .select("detail,problem_visitors!inner(user_id)").eq("visitor_id",id).eq("problem_visitors.user_id",context.userId)
       .order("recorded_at",{ascending:false}).order("record_key").range(offset,offset+199);
     if(error)throw new Error("MATCH_DETAILS_READ_FAILED");
     details.push(...data.map(row=>row.detail as MatchDetail));
     if(data.length<200)return details;
   }
 });
