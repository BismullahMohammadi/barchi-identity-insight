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
 const groups=new Map<string,{original:number; label:string}[]>();
 for(const [key,label] of Object.entries(expected)){
  const original=Number(key);
  const preferred=(aliases[key]??aliases[label]??label).trim()||label;
  const group=groups.get(preferred)??[];
  group.push({original,label});
  groups.set(preferred,group);
 }
 const occupied=new Set<number>();
 for(const [preferred,entries] of groups){
  const positions=rawHeader.map((cell,i)=>headerMatches(String(cell??""),preferred)?i:-1).filter(i=>i>=0);
  entries.sort((a,b)=>a.original-b.original);
  // Repeated source headings are legitimate: align their occurrences in column order.
  // Never infer a missing or extra duplicate as a valid metric.
  if(positions.length!==entries.length){
   throw new Error((positions.length>entries.length?"AMBIGUOUS_COLUMN: ":"SHEET_MAPPING_MISMATCH: ")+preferred);
  }
  entries.forEach((entry,i)=>{
   const from=positions[i]!;
   if(occupied.has(from))throw new Error("AMBIGUOUS_COLUMN: "+preferred);
   occupied.add(from);
   indices.set(entry.original,from);
  });
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
