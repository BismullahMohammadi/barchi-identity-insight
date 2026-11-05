import type {RecentReferral} from "./recent-referrals";

/** Normalize Arabic/Persian/Pashto variants, diacritics, invisible marks and spacing. */
export function normalizePersonName(value:string):string {
 return value.normalize("NFKC").toLowerCase()
  .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200c-\u200f\u202a-\u202e]/g,"")
  .replace(/[يىېۍئ]/g,"ی").replace(/[ك]/g,"ک").replace(/[ۀة]/g,"ه").replace(/[أإآ]/g,"ا")
  .replace(/[^\p{L}\p{N}]+/gu,"").trim();
}
function distance(a:string,b:string):number {
 const prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  let last=prev[0]!;prev[0]=i;
  for(let j=1;j<=b.length;j++){
   const old=prev[j]!;
   prev[j]=Math.min(prev[j]!+1,prev[j-1]!+1,last+(a[i-1]===b[j-1]?0:1));
   last=old;
  }
 }
 return prev[b.length]!;
}
function close(a:string,b:string):boolean {
 if(!a||!b)return false;
 if(a===b)return true;
 const longest=Math.max(a.length,b.length);
 if(longest<5||Math.abs(a.length-b.length)>2)return false;
 return distance(a,b)<= (longest>=10?2:1);
}
/** A match requires name + father corroboration. Missing father never triggers fuzzy highlighting. */
export function matchesRegisteredPerson(intake:RecentReferral,registered:RecentReferral[]):boolean {
 const name=normalizePersonName(intake.name),father=normalizePersonName(intake.father);
 if(!name||!father||father==="—")return false;
 return registered.some(r=>{
  const rn=normalizePersonName(r.name),rf=normalizePersonName(r.father);
  if(!rn||!rf||rf==="—")return false;
  if(name===rn&&father===rf)return true;
  // Conservative fuzzy matching: at most one small spelling difference across both fields,
  // or one in each for longer names, never relying on the name alone.
  if(!close(name,rn)||!close(father,rf))return false;
  const edits=distance(name,rn)+distance(father,rf);
  return edits<= (Math.min(name.length,father.length)>=7?2:1);
 });
}
