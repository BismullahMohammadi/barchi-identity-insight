import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Nav } from "@/routes/_authenticated/dashboard";
import { readReconciliation } from "@/lib/reconciliation.server";
import type { DashboardContext } from "@/lib/dashboard-permissions.server";

vi.mock("@tanstack/react-router", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({to, children}: {to: string; children: React.ReactNode}) => <a href={to}>{children}</a>,
}));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("shows the reconciliation menu to a manager granted only that report", () => {
  render(<Nav permissions={{reconciliation:["view"]}} />);
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", {name:"د راپورونو پرتله"})).toHaveAttribute("href","/dashboard/reconciliation");
});

it("rechecks the manager's active grant before serving cached reconciliation results", async () => {
  vi.stubEnv("OWNER_EMAILS", "owner@example.org");
  vi.stubEnv("LOVABLE_API_KEY", "fixture");
  vi.stubEnv("GOOGLE_SHEETS_API_KEY", "fixture");
  const profile = {active:true, role:"manager", permissions:{reconciliation:["view"]}};
  const context = {
    userId:"fixture-manager", claims:{email:"manager@example.org"},
    supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error:null})})})})},
  } as unknown as DashboardContext;
  const fetch = vi.fn(async () => Response.json({sheets:[]}));
  vi.stubGlobal("fetch",fetch);
  const month={year:1405,month:8,refresh:false};
  expect((await readReconciliation(month,context)).year).toBe(1405);
  expect(fetch).toHaveBeenCalledTimes(2);
  profile.permissions.reconciliation=[];
  await expect(readReconciliation(month,context)).rejects.toThrow("ACCESS_DENIED");
  profile.permissions.reconciliation=["view"];
  profile.active=false;
  await expect(readReconciliation(month,context)).rejects.toThrow("ACCESS_DENIED");
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("applies a saved day-header row override to the selected source", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "fixture");
  vi.stubEnv("GOOGLE_SHEETS_API_KEY", "fixture");
  const profile = {active:true, role:"manager", permissions:{reconciliation:["view"]}};
  const context = {
    userId:"header-row-fixture", claims:{email:"manager@example.org"},
    supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error:null})})})})},
  } as unknown as DashboardContext;
  const days=Array.from({length:30},(_,index)=>String(index+1));
  const localGrid:unknown[][]=[["بخشونه (قوس ۹)"],[],["یادښت"],days];
  const provinceGrid:unknown[][]=[["گزارش ماه قوس سال مالی ۱۴۰۵"],["","","","","","",...days]];
  const fetch=vi.fn(async(input:RequestInfo|URL)=>{
    const url=String(input),local=url.includes("1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs");
    if(url.includes("/values:batchGet"))return Response.json({valueRanges:[{values:local?localGrid:provinceGrid}]});
    return Response.json({sheets:[{properties:{title:local?"ریاست ته ګزارش":"مرکز دشت برچی",sheetId:1}}]});
  });
  vi.stubGlobal("fetch",fetch);
  const result=await readReconciliation({year:1405,month:9,refresh:true,headerRows:{local:4}},context);
  expect(result.local).toMatchObject({block:"available",dayHeaderRow:4});
  expect(result.province).toMatchObject({block:"available",dayHeaderRow:2});
});

