import type { ProblemVisitor } from "./problem-visitors.functions";
import type { RecentReferrals } from "./recent-referrals";

/** Normalize common Pashto/Dari name spelling and spacing variants. */
export function normalizedPerson(value: string): string {
 return value.normalize("NFKC").toLowerCase()
  .replace(/[يىئ]/g,"ی").replace(/ك/g,"ک").replace(/[أإآٱ]/g,"ا")
  .replace(/[ۀة]/g,"ه").replace(/[\u064B-\u065F\u0670\u0640]/g,"")
  .replace(/[\u200c\u200d\s]+/g,"").trim();
}
function editDistance(a:string,b:string,max:number):number {
 if(Math.abs(a.length-b.length)>max)return max+1;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const cur=[i];
  let min=i;
  for(let j=1;j<=b.length;j++){
   const cost=a[i-1]===b[j-1]?0:1;
   const value=Math.min(prev[j]!+1,cur[j-1]!+1,prev[j-1]!+cost);
   cur.push(value);
   if(value<min)min=value;
  }
  if(min>max)return max+1;
  prev=cur;
 }
 return prev[b.length]!;
}
/** Strict for short names; bounded typo tolerance for longer names. */
export function nameMatch(a:string,b:string):"exact"|"similar"|null {
 const x=normalizedPerson(a),y=normalizedPerson(b);
 if(!x||!y)return null;
 if(x===y)return "exact";
 const shortest=Math.min(x.length,y.length);
 if(shortest<5)return null;
 const max=shortest>=10?2:1;
 return editDistance(x,y,max)<=max?"similar":null;
}
export function findPotentialProblemMatches(list:ProblemVisitor[],incoming:RecentReferrals) {
 const entries=[...incoming.newReferrals.people.map(p=>({...p,section:"intake" as const,date:incoming.newReferrals.date})),...incoming.registration.people.map(p=>({...p,section:"registration" as const,date:incoming.registration.date}))];
 const seen=new Set<string>();
 return list.filter(v=>v.status==="active").flatMap(v=>entries.flatMap(p=>{
  const name=nameMatch(v.full_name,p.name),father=nameMatch(v.father_name,p.father);
  // Require both full name and father name to match at least approximately.
  if(!name||!father)return [];
  const confidence:nameMatchConfidence=name==="exact"&&father==="exact"?"normalized-exact":"possible";
  return [{visitor:v,record:p,confidence,key:[v.id,p.section,p.date,normalizedPerson(p.name),normalizedPerson(p.father)].join("|")}];
 })).filter(m=>!seen.has(m.key)&&!!seen.add(m.key));
}
type nameMatchConfidence="normalized-exact"|"possible";
