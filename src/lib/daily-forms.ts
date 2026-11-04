import { toLatinDigits, type JDate, jKey } from "./jalali";

const MONTHS = ["حمل","ثور","جوزا","سرطان","اسد","سنبله","میزان","عقرب","قوس","جدی","دلو","حوت"];
const MONTH_ALIASES: Record<string, number> = Object.fromEntries(MONTHS.map((m,i)=>[m,i+1]));
Object.assign(MONTH_ALIASES,{"جدي":10,"سراطان":4,"جواز":3});
function normalizeName(raw: string): string {
  return toLatinDigits(raw).replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\u200d]/g,"").replace(/[-–—]/g," ").replace(/\s+/g," ").trim();
}
export function parseNamedJalaliTab(name: string): JDate | null {
  const s=normalizeName(name);
  const m=s.match(/^(\d{1,2}|اول|اولین)\s*([^\d\s]+)\s*(14\d\d)?$/);
  if (!m) return null;
  const day=m[1]==="اول"||m[1]==="اولین" ? 1 : Number(m[1]);
  const month=MONTH_ALIASES[m[2] ?? ""] ?? null;
  const year=Number(m[3] ?? "1405");
  if (!month || year!==1405 || day<1 || day>(month<=6?31:month<=11?30:30)) return null;
  return {y:year,m:month,d:day};
}
/** Prefer today's tab; otherwise show latest dated report not newer than today. */
export function selectDailyTab(names:string[],today:JDate): {name:string,date:JDate}|null {
  const candidates=names.map(name=>({name,date:parseNamedJalaliTab(name)}))
    .filter((v):v is {name:string,date:JDate}=>v.date!==null && jKey(v.date)<=jKey(today))
    .sort((a,b)=>jKey(b.date)-jKey(a.date));
  return candidates[0] ?? null;
}

/** Registration visitor lists must never silently fall back to yesterday. */
export function selectTodayDailyTab(names:string[],today:JDate): {name:string,date:JDate}|null {
 const selected=selectDailyTab(names,today);
 return selected&&jKey(selected.date)===jKey(today)?selected:null;
}

/* ---------- Registration coordination workbook (tolerant tab naming) ----------
 * Real tab titles are typed by hand: "13 عفرب 1405" (ف for ق), "5سنبله 1405",
 * "19 اسد" (no year), " 17 جوزا", "12 حمل  1405", "اول میزان 1405", plus 1404 tabs and
 * templates such as "نمونه جدول هماهنگی 1405". Used only for registration, never for intake.
 */
const LOOKALIKE: Record<string,string> = {"ف":"ق","ق":"ق","ك":"ک","ي":"ی","ى":"ی","ة":"ه","أ":"ا","إ":"ا","آ":"ا"};
function foldLetters(s:string):string{return [...s].map(c=>LOOKALIKE[c]??c).join("");}
const FOLDED_MONTHS = new Map<string,number>([
 ...MONTHS.map((m,i)=>[foldLetters(m),i+1] as [string,number]),
 [foldLetters("سراطان"),4],[foldLetters("جواز"),3],[foldLetters("جوزه"),3],
]);
function distanceAtMostOne(a:string,b:string):boolean{
 if(a===b)return true;
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;continue;}
  if(++edits>1)return false;
  if(a.length>b.length)i++; else if(b.length>a.length)j++; else {i++;j++;}
 }
 return edits+(a.length-i)+(b.length-j)<=1;
}
/** Exact/alias month first; then a unique one-letter typo match for names of 4+ letters. */
export function matchJalaliMonth(raw:string):number|null{
 const folded=foldLetters(raw);
 const exact=FOLDED_MONTHS.get(folded);
 if(exact)return exact;
 if(folded.length<4)return null;
 const hits=new Set([...FOLDED_MONTHS].filter(([m])=>m.length>=4&&distanceAtMostOne(m,folded)).map(([,n])=>n));
 return hits.size===1?[...hits][0]!:null;
}
export function parseCoordinationTabDate(name:string,defaultYear:number):JDate|null{
 const s=normalizeName(name);
 const m=s.match(/^(\d{1,2}|اول|اولین)\s*([^\d\s]+)\s*(1[34]\d\d)?$/);
 if(!m)return null;
 const day=m[1]==="اول"||m[1]==="اولین"?1:Number(m[1]);
 const month=matchJalaliMonth(m[2]??"");
 const year=m[3]?Number(m[3]):defaultYear;
 if(!month||day<1||day>(month<=6?31:30))return null;
 return {y:year,m:month,d:day};
}
export type CoordinationTabPick={today:{name:string,date:JDate}|null;latest:{name:string,date:JDate}|null};
/** Today's coordination tab only (never yesterday), plus the latest earlier tab as safe diagnostic metadata. */
export function selectTodayCoordinationTab(names:string[],today:JDate):CoordinationTabPick{
 const dated=names.map(name=>({name,date:parseCoordinationTabDate(name,today.y)}))
  .filter((v):v is {name:string,date:JDate}=>v.date!==null&&jKey(v.date)<=jKey(today))
  .sort((a,b)=>jKey(b.date)-jKey(a.date));
 const exact=dated.filter(v=>jKey(v.date)===jKey(today));
 // Prefer a correctly spelled title when two tabs claim the same day.
 const todayTab=exact.find(v=>parseNamedJalaliTab(v.name)!==null)??exact[0]??null;
 return {today:todayTab,latest:dated.find(v=>jKey(v.date)<jKey(today))??null};
}
