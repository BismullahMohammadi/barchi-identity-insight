import type { ProblemVisitor } from "./problem-visitors.functions";
import type { RecentReferrals } from "./recent-referrals";
export function normalizedPerson(value:string):string {
 return value.trim().toLowerCase().replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[أإآ]/g,"ا").replace(/ۀ/g,"ه").replace(/\s+/g," ");
}
export function findPotentialProblemMatches(list:ProblemVisitor[],incoming:RecentReferrals) {
 const entries=[...incoming.newReferrals.people.map(p=>({...p,section:"intake" as const,date:incoming.newReferrals.date})),...incoming.registration.people.map(p=>({...p,section:"registration" as const,date:incoming.registration.date}))];
 const seen=new Set<string>();
 return list.filter(v=>v.status==="active").flatMap(v=>entries.filter(p=>normalizedPerson(v.full_name)===normalizedPerson(p.name)&&normalizedPerson(v.father_name)===normalizedPerson(p.father)).map(p=>({visitor:v,record:p,key:[v.id,p.section,p.date,normalizedPerson(p.name),normalizedPerson(p.father)].join("|")}))).filter(m=>!seen.has(m.key)&&!!seen.add(m.key));
}
