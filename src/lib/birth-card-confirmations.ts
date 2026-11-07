import {normalizeFileCode} from "./rejection-reasons";
import {toLatinDigits} from "./jalali";

export type DailyApproval={total:number;birthCount:number;paperCount:number;ageCount:number};
const normalize=(v:unknown)=>String(v??"").replace(/[\u200b-\u200f\s]/g,"").replace(/[يى]/g,"ی").replace(/ك/g,"ک");
const numeric=(v:unknown)=>{
 const raw=toLatinDigits(String(v??"").trim()).replace(/[٬,]/g,"");
 if(!/^\d+$/.test(raw))return 0;
 const n=Number(raw);
 return Number.isSafeInteger(n)&&n>0&&n<=500?n:0;
};
/** A positive number in ANY of the three verification columns confirms the file.
 * Header positions are discovered independently inside each employee's block.
 */
export function dailyApprovalDetails(grid:unknown[][]):Map<string,DailyApproval>{
 const result=new Map<string,DailyApproval>();
 const headerIndex=grid.findIndex(row=>row.some(v=>normalize(v).includes("کددوسیه"))&&row.some(v=>/مطابقتذکره|مطابقکارتتولد|تعینسنوضمانت|تعیینسنوضمانت/.test(normalize(v))));
 if(headerIndex<0)return result;
 const headers=grid[headerIndex]??[];
 const codes=headers.map((v,i)=>normalize(v).includes("کددوسیه")?i:-1).filter(i=>i>=0);
 for(let i=0;i<codes.length;i++){
  const codeCol=codes[i]!,end=codes[i+1]??headers.length;
  const cols={paper:-1,birth:-1,age:-1};
  for(let j=codeCol+1;j<end;j++){
   const h=normalize(headers[j]);
   if(/مطابقتذکره(?:کاغذی|کاغدی)/.test(h))cols.paper=j;
   else if(h.includes("مطابقکارتتولد"))cols.birth=j;
   else if(/(?:تعین|تعیین)سنوضمانت/.test(h))cols.age=j;
  }
  if(Object.values(cols).every(c=>c<0))continue;
  for(const row of grid.slice(headerIndex+1)){
   const code=normalizeFileCode(row[codeCol]);
   if(!code)continue;
   const paperCount=cols.paper>=0?numeric(row[cols.paper]):0;
   const birthCount=cols.birth>=0?numeric(row[cols.birth]):0;
   const ageCount=cols.age>=0?numeric(row[cols.age]):0;
   if(!paperCount&&!birthCount&&!ageCount)continue;
   const prev=result.get(code);
   const paper=Math.max(prev?.paperCount??0,paperCount);
   const birth=Math.max(prev?.birthCount??0,birthCount);
   const age=Math.max(prev?.ageCount??0,ageCount);
   result.set(code,{paperCount:paper,birthCount:birth,ageCount:age,total:paper+birth+age});
  }
 }
 return result;
}
/** Backwards-compatible birth-only subset, used for registration referrals. */
export function birthCardConfirmations(grid:unknown[][]):Map<string,number>{
 return new Map([...dailyApprovalDetails(grid)].filter(([,v])=>v.birthCount>0).map(([k,v])=>[k,v.birthCount]));
}
