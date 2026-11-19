import { createHash } from "node:crypto";
import { normalizedPerson } from "./problem-visitor-matching";
import type { ProblemVisitor } from "./problem-visitors.functions";

export const visitorWorkbook = "1VaYPi9P6Xnm2JKRVHc5rg_n-cwqZ1PXKGLVvObbYAck";
export const visitorRange = encodeURIComponent("'مراجعین مشکلاتی'!A:H");
type Entry = Pick<ProblemVisitor,"full_name"|"father_name"|"issue"> & {source_key:string};

export function parseProblemVisitorSheet(grid: string[][]) {
  const labels = ["اسم","ولد","شرح مشکل مراجع کننده"].map(normalizedPerson);
  const header = grid.slice(0,10).findIndex(row => labels.every(label => row.map(normalizedPerson).includes(label)));
  if (header < 0) throw new Error("VISITOR_SHEET_HEADER");
  const columns = grid[header]!.map(normalizedPerson);
  const entries: Entry[] = [];
  let skipped = 0;
  for (const row of grid.slice(header+1)) {
    const [full_name="",father_name="",issue=""] = labels.map(label => row[columns.indexOf(label)]?.trim() ?? "");
    if (!full_name && !father_name && !issue) continue;
    if (full_name.length<2 || father_name.length<2 || issue.length<3 ||
        full_name.length>180 || father_name.length>180 || issue.length>2000) { skipped++; continue; }
    // Use content rather than the row number so sorting or inserting rows is safe.
    const key = JSON.stringify([normalizedPerson(full_name),normalizedPerson(father_name),issue.normalize("NFKC").trim()]);
    entries.push({source_key:createHash("sha256").update(key).digest("hex"),full_name,father_name,issue});
  }
  return {entries,skipped};
}
