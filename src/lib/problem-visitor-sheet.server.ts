import { visitorWorkbook, visitorRange, parseProblemVisitorSheet } from "./problem-visitor-sheet";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireDashboardPermission, type DashboardContext } from "./dashboard-permissions.server";
import type { ProblemVisitor } from "./problem-visitors.functions";
import { sheetConnectionHeaders } from "./sheets-access.server";

async function importSheet(userId: string) {
  const response = await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${visitorWorkbook}/values/${visitorRange}`, {
    headers:sheetConnectionHeaders(), cache:"no-store", signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("VISITOR_SHEET_UNAVAILABLE");
  const {values} = await response.json() as {values?:string[][]};
  const {entries,skipped} = parseProblemVisitorSheet(values ?? []);
  const admin = supabaseAdmin as unknown as SupabaseClient;
  for (let i=0; i<entries.length; i+=250) {
    const {error} = await admin.rpc("import_sheet_problem_visitors",{account_id:userId,entries:entries.slice(i,i+250)});
    if (error) throw new Error("VISITOR_SHEET_IMPORT_FAILED");
  }
  return skipped;
}

export async function loadProblemVisitors(context: DashboardContext, activeOnly=false) {
  await requireDashboardPermission(context,"problem-visitors");
  let skipped: number | null;
  try { skipped = await importSheet(context.userId); }
  catch { skipped = null; }
  const visitors: ProblemVisitor[] = [];
  for (let offset=0; ; offset+=500) {
    let query=context.supabase.from("problem_visitors").select("id,full_name,father_name,issue,status,created_at")
      .eq("user_id",context.userId).order("created_at",{ascending:false}).order("id");
    if (activeOnly) query=query.eq("status","active");
    const {data,error}=await query.range(offset,offset+499);
    if (error) throw new Error("PROBLEM_VISITORS_READ_FAILED");
    visitors.push(...data as ProblemVisitor[]);
    if (data.length<500) break;
  }
  return {visitors,skipped};
}
