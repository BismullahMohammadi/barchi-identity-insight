import { googleToken, required } from "./google-sheet-credentials";
import { parseProblemVisitorSheet, visitorRange, visitorWorkbook } from "../src/lib/problem-visitor-sheet";

async function sync() {
  const token=await googleToken();
  const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${visitorWorkbook}/values/${visitorRange}`,{
    headers:{Authorization:`Bearer ${token}`},
  });
  if (!response.ok) throw new Error("Sheet read failed: "+response.status);
  const {values}=await response.json() as {values?:string[][]};
  const {entries,skipped}=parseProblemVisitorSheet(values??[]);
  const key=required("SCHEDULE_SUPABASE_SERVICE_ROLE_KEY");
  const url=required("SCHEDULE_SUPABASE_URL").replace(/\/$/,"");
  for(let i=0;i<entries.length;i+=250){
    const result=await fetch(url+"/rest/v1/rpc/import_sheet_visitors_for_managers",{
      method:"POST", headers:{apikey:key,...(key.startsWith("sb_secret_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"},
      body:JSON.stringify({entries:entries.slice(i,i+250)}),
    });
    if(!result.ok) throw new Error("Visitor import failed: "+result.status);
  }
  if(skipped) throw new Error("Incomplete sheet rows require review: "+skipped);
}
await sync();
