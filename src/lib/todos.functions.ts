import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDashboardPermission } from "./dashboard-permissions.server";

export type StoredTodo={id:string;title:string;done:boolean;createdAt:number};
type DbTodo={id:string;title:string;completed:boolean;created_at:string};
type TodoCommand =
 | {action:"add";title:string}
 | {action:"toggle";id:string;done:boolean}
 | {action:"delete";id:string}
 | {action:"import";items:{legacyKey:string;title:string;done:boolean;createdAt:number}[]};

function mapTodo(t:DbTodo):StoredTodo {
 return {id:t.id,title:t.title,done:t.completed,createdAt:Date.parse(t.created_at)};
}
export const getTodos=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 setResponseHeader("Cache-Control","private, no-store");
 await requireDashboardPermission(context,"dashboard");
 const db=context.supabase as unknown as SupabaseClient;
 const {data,error}=await db.from("dashboard_todos").select("id,title,completed,created_at")
  .eq("user_id",context.userId).order("created_at",{ascending:false}).limit(200);
 if(error)throw new Error("TODO_READ_FAILED");
 return (data as DbTodo[]).map(mapTodo);
});
export const changeTodo=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((input:TodoCommand)=>{
  if(!input || !["add","toggle","delete","import"].includes(input.action))throw new Error("INVALID_TODO");
  if(input.action==="add" && (!input.title?.trim() || input.title.trim().length>180))throw new Error("INVALID_TODO");
  if((input.action==="toggle"||input.action==="delete") && !/^[0-9a-f-]{36}$/i.test(input.id))throw new Error("INVALID_TODO");
  if(input.action==="import" && (!Array.isArray(input.items)||input.items.length>100||input.items.some(i=>!i.legacyKey || i.legacyKey.length>120 || !i.title?.trim() || i.title.length>180 || typeof i.done!=="boolean" || !Number.isFinite(i.createdAt))))throw new Error("INVALID_TODO");
  return input;
 }).handler(async({context,data})=>{
  setResponseHeader("Cache-Control","private, no-store");
  await requireDashboardPermission(context,"dashboard",data.action==="toggle"?"edit":data.action==="delete"?"delete":"create");
  const db=context.supabase as unknown as SupabaseClient;
  const owner=context.userId;
  if(data.action==="add"){
   const {error}=await db.from("dashboard_todos").insert({user_id:owner,title:data.title.trim()});
   if(error)throw new Error("TODO_WRITE_FAILED");
  }else if(data.action==="toggle"){
   const {error}=await db.from("dashboard_todos").update({completed:data.done}).eq("user_id",owner).eq("id",data.id);
   if(error)throw new Error("TODO_WRITE_FAILED");
  }else if(data.action==="delete"){
   const {error}=await db.from("dashboard_todos").delete().eq("user_id",owner).eq("id",data.id);
   if(error)throw new Error("TODO_WRITE_FAILED");
  }else{
   // Import is replay-safe: old browser items retain their unique legacy key.
   for(const item of data.items){
    const {error}=await db.from("dashboard_todos").upsert({
     user_id:owner,legacy_key:item.legacyKey,title:item.title.trim(),completed:item.done,
     created_at:new Date(Math.min(Date.now(),Math.max(0,item.createdAt))).toISOString(),
    },{onConflict:"user_id,legacy_key",ignoreDuplicates:true});
    if(error)throw new Error("TODO_IMPORT_FAILED");
   }
  }
  return {ok:true};
 });
