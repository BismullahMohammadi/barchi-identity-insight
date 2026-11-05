import {normalizeFileCode} from "./rejection-reasons";
import {toLatinDigits} from "./jalali";
export function birthCardConfirmations(grid:unknown[][]):Map<string,number>{
 const norm=(v:unknown)=>String(v??"").replace(/\s+/g,"").replace(/[يى]/g,"ی").replace(/ك/g,"ک");
 const headerIndex=grid.findIndex(row=>row.some(v=>norm(v).includes("کددوسیه"))&&row.some(v=>norm(v).includes("مطابقکارتتولد")));
 const result=new Map<string,number>();
 if(headerIndex<0)return result;
 const header=grid[headerIndex]??[];
 const codeCols=header.map((v,i)=>norm(v).includes("کددوسیه")?i:-1).filter(i=>i>=0);
 for(let i=0;i<codeCols.length;i++){
  const codeCol=codeCols[i]!,next=codeCols[i+1]??header.length;
  const birthCol=header.findIndex((v,j)=>j>codeCol&&j<next&&norm(v).includes("مطابقکارتتولد"));
  if(birthCol<0)continue;
  for(const row of grid.slice(headerIndex+1)){
   const key=normalizeFileCode(row[codeCol]);
   const raw=toLatinDigits(String(row[birthCol]??"").trim());
   const value=/^\d+$/.test(raw)?Number(raw):0;
   if(key&&value>0&&value<=500)result.set(key,Math.max(value,result.get(key)??0));
  }
 }
 return result;
}
