import { createHash } from "node:crypto";
import { visitorWorkbook, visitorRange, parseProblemVisitorSheet } from "./problem-visitor-sheet";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireDashboardPermission, type DashboardContext } from "./dashboard-permissions.server";
import type { ProblemVisitor } from "./problem-visitors.functions";
import { sheetConnectionHeaders } from "./sheets-access.server";

async function importSheet(userId: string, signal?: AbortSignal) {
  const response = await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${visitorWorkbook}/values/${visitorRange}`, {
    headers:sheetConnectionHeaders(), cache:"no-store", signal:signal ?? AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("VISITOR_SHEET_UNAVAILABLE");
  const {values} = await response.json() as {values?:string[][]};
  const {entries,skipped} = parseProblemVisitorSheet(values ?? []);
  const admin = supabaseAdmin as unknown as SupabaseClient;
  for (let i=0; i<entries.length; i+=250) {
    signal?.throwIfAborted();
    const request = admin.rpc("import_sheet_problem_visitors",{account_id:userId,entries:entries.slice(i,i+250)});
    const {error} = await (signal ? request.abortSignal(signal) : request);
    if (error) throw new Error("VISITOR_SHEET_IMPORT_FAILED");
  }
  return skipped;
}

export async function loadProblemVisitors(context: DashboardContext, activeOnly=false, signal?: AbortSignal) {
  await requireDashboardPermission(context,"problem-visitors");
  let skipped: number | null;
  try { skipped = await importSheet(context.userId,signal); }
  catch { skipped = null; }
  return {visitors: await readVisitorRows(context, activeOnly,signal), skipped};
}

export async function readVisitorRows(context: DashboardContext, activeOnly: boolean, signal?: AbortSignal) {
  const visitors: ProblemVisitor[] = [];
  for (let offset=0; ; offset+=500) {
    signal?.throwIfAborted();
    let query=context.supabase.from("problem_visitors").select("*")
      .eq("user_id",context.userId).order("created_at",{ascending:false}).order("id");
    if (activeOnly) query=query.eq("status","active");
    if (signal) query=query.abortSignal(signal);
    const {data,error}=await query.range(offset,offset+499);
    if (error) throw new Error("PROBLEM_VISITORS_READ_FAILED");
    for (const { id, full_name, father_name, issue, status, created_at, first_matched_at } of data) {
      visitors.push({ id, full_name, father_name, issue, status, created_at, first_matched_at });
    }
    if (data.length<500) break;
  }
  return visitors;
}


export const matchRecordKey = (key:string) => createHash("sha256").update(key).digest("hex");

export async function rememberProblemMatches(userId: string, matches: ReturnType<typeof import("./problem-visitor-matching").findPotentialProblemMatches>, signal?: AbortSignal) {
  if (!matches.length) return true;
  const visitors = matches.map(m => m.visitor);
  const ids = [...new Set(visitors.filter(v => !v.first_matched_at).map(v => v.id))];

  const admin = supabaseAdmin as unknown as SupabaseClient;
  for (let offset = 0; offset < ids.length; offset += 100) {
    signal?.throwIfAborted();
    const request = admin.from("problem_visitors")
      .update({ first_matched_at: new Date().toISOString() })
      .eq("user_id", userId).eq("status", "active").is("first_matched_at", null)
      .in("id", ids.slice(offset, offset + 100));
    const { error } = await (signal ? request.abortSignal(signal) : request);
    if (error) return false;
  }
  const entries = matches.map(({visitor,record,key,confidence}) => ({
    visitor_id: visitor.id, key:matchRecordKey(key), detail: {
      name: record.name, father: record.father, section: record.section, date: record.date,
      sheet: record.source, familyMembers: record.familyMembers, fileCode: record.fileCode || null,
      team: record.team || null, confidence,
    },
  }));
  for (let offset=0; offset<entries.length; offset+=200) {
    signal?.throwIfAborted();
    const request = admin.rpc("save_problem_match_details",{account_id:userId,entries:entries.slice(offset,offset+200)});
    const {error} = await (signal ? request.abortSignal(signal) : request);
    if(error) return false;
  }
  return true;
}
