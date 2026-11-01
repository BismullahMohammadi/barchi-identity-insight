import {SHEET_COLUMNS,headerMatches} from "./sheet-columns";
export const COLUMN_ALIAS_KEY="barchi-sheet-header-aliases-v1";
export type HeaderAliases=Record<string,Record<string,string>>;
export function readAliases():HeaderAliases{
 if(typeof window==="undefined")return {};
 try{const value=JSON.parse(window.localStorage.getItem(COLUMN_ALIAS_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}catch{return {};}
}
export function resolveMappedGrid(grid:string[][],title:string):string[][]{
 const cfg=SHEET_COLUMNS[title];
 if(!cfg||title==="ریاست ته ګزارش")return grid;
 const rawHeader=grid[cfg.headerRow]??[];
 const aliases=readAliases()[title]??{};
 const expected=cfg.expectedHeaders;
 // Treat new column order and inserted columns by binding known header labels, rather than fixed positions.
 const indices=new Map<number,number>();
 for(const [k,v] of Object.entries(expected)){
  const original=Number(k), preferred=aliases[v]||v;
  const candidates=rawHeader.map((cell,i)=>headerMatches(String(cell??""),preferred)?i:-1).filter(i=>i>=0);
  if(candidates.length===1)indices.set(original,candidates[0]!);
  else if(candidates.length>1)throw new Error("AMBIGUOUS_COLUMN: "+preferred);
  else throw new Error("SHEET_MAPPING_MISMATCH: "+preferred);
 }
 // Only reorder when every numeric/date/label index has a known mapping.
 const cols=[cfg.dateCol,cfg.labelCol,...cfg.metricCols].filter(i=>i>=0);
 const reordered=Array.from(indices).some(([to,from])=>to!==from);
 for(const col of cols){if(!indices.has(col)){
   if(!reordered&&col<rawHeader.length&&!Array.from(indices.values()).includes(col))indices.set(col,col);
   else throw new Error("COLUMN_MAPPING_REQUIRED: "+String(rawHeader[col]??col+1));
 }}
 const width=Math.max(rawHeader.length,...cols.map(x=>x+1),0);
 return grid.map((row,rowIndex)=>{
  const next=Array.from({length:width},(_,i)=>row[i]??"");
  for(const [to,from] of indices)next[to]=row[from]??"";
  if(rowIndex===cfg.headerRow)for(const [at,expectedName] of Object.entries(expected))next[Number(at)]=expectedName;
  return next;
 });
}
