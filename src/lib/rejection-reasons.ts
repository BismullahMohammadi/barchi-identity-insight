import {toLatinDigits} from "./jalali";

export function normalizeFileCode(value:unknown):string {
 return toLatinDigits(String(value??"")).normalize("NFKC").replace(/[\u064b-\u065f\u200b-\u200f\s\-_/.,،]/g,"").toUpperCase();
}
function header(value:unknown):string {
 return String(value??"").replace(/\s+/g,"").replace(/[يى]/g,"ی").replace(/ك/g,"ک");
}
/** Each daily worker block has a file-code column and a rejection reason column.
 * Discover both from the worksheet headers instead of assuming fixed columns.
 */
export function extractRejectedFiles(grid:unknown[][]):Map<string,string> {
 const result=new Map<string,string>();
 const reasonRow=grid.findIndex(row=>row.some(v=>/دلیلردشدندوسیه/.test(header(v))));
 const codeRow=grid.findIndex((row,i)=>i>reasonRow&&i<Math.min(grid.length,30)&&row.some(v=>/کددوسیه/.test(header(v))));
 if(reasonRow<0||codeRow<0)return result;
 const reasons=(grid[reasonRow]??[]).map((v,i)=>/دلیلردشدندوسیه/.test(header(v))?i:-1).filter(i=>i>=0);
 const codes=(grid[codeRow]??[]).map((v,i)=>/کددوسیه/.test(header(v))?i:-1).filter(i=>i>=0);
 const blocks=codes.map((code,i)=>({code,reason:reasons.find(r=>r>code&&r<(codes[i+1]??Infinity))})).filter((b):b is {code:number;reason:number}=>b.reason!==undefined);
 for(const row of grid.slice(codeRow+1)){
  for(const {code,reason} of blocks){
   const key=normalizeFileCode(row[code]);
   const explanation=String(row[reason]??"").trim();
   if(key&&explanation&&key.length>=2)result.set(key,explanation.slice(0,500));
  }
 }
 return result;
}
