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
