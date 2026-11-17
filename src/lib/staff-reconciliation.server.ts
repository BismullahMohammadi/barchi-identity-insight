import { authorizedSheetHeaders } from './sheets-access.server';
import { MONTH_NAMES } from './monthly-staff-completeness';
import { isFridayJalali } from './holidays';

const BASE = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const CONTROL_ID = '1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs';
const STAFF_ID = '1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8';
export const STAFF = [
  { name: 'نېک ولي خان ایمان', match: /(?:ایمان|ايمان)/, column: 1, activity: 'تصدیق انفرادی' },
  { name: 'محمد نسیم هاشمي', match: /(?:نسیم|نسيم).*هاشم/, column: 2, activity: 'تصدیق انفرادی' },
  { name: 'عزیزالله الطاف', match: /(?:عزیز|عزيز).*الطاف/, column: 3, activity: 'تصدیق انفرادی' },
  { name: 'فاطمه علي رضایي', match: /فاطمه.*(?:رضا|رضاي)/, column: 4, activity: 'تصدیق انفرادی' },
  { name: 'محمد نبي بهزاد', match: /(?:نبي|نبی).*بهزاد/, column: 5, activity: 'ثبت تولد' },
] as const;
const digits = (s: string) => s.replace(/[۰-۹]/g, x => String(x.charCodeAt(0)-1776)).replace(/[٠-٩]/g, x => String(x.charCodeAt(0)-1632));
const normalize = (x: unknown) => digits(String(x ?? '')).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
const number = (x: unknown): number | null => { const s=normalize(x).replace(/[,٬]/g,''); return s!=='' && /^\d+$/.test(s) ? Number(s) : null; };
const monthTitle = (titles: string[], month: number) => { const name=MONTH_NAMES[month]; if(name===undefined)return null; return titles.filter(t=>normalize(t).includes(name)).sort((a,b)=>Number(/گزارش|ګزارش/.test(b))-Number(/گزارش|ګزارش/.test(a)))[0] ?? null; };
async function read<T>(url:string,headers:Record<string,string>):Promise<T> {
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!r.ok)throw new Error('SHEETS_READ_'+r.status);
 return r.json() as Promise<T>;
}
export function compareStaff(control:unknown[][], staff:unknown[][], year:number, month:number) {
 const headerIndex=staff.slice(0,10).findIndex(r=>normalize(r[3])==='اسم' && normalize(r[6]).includes('فعالیت'));
 const header=staff[headerIndex]??[];
 const days=Array.from({length:month<=6?31:month<=11?30:30},(_,i)=>i+1);
 const dayCols=new Map<number,number>();
 header.forEach((cell,i)=>{const n=number(cell);if(i>=7&&n!==null&&n>=1&&n<=31)dayCols.set(n,i);});
 const entries=STAFF.map(person=>{
  let active=false;let activityRow:unknown[]|null=null;let rowIndex=-1;
  for(let i=headerIndex+1;i<staff.length;i++){
   const row=staff[i]??[];const name=normalize(row[3]);
   if(name){active=person.match.test(name); }
   if(active&&normalize(row[6])===normalize(person.activity)){activityRow=row;rowIndex=i+1;break;}
  }
  return {person,activityRow,rowIndex};
 });
 return days.flatMap(day=>entries.map(({person,activityRow,rowIndex})=>{
  const date=`${year}/${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
  const controlIndex=control.findIndex(r=>normalize(r[0]).replace(/-/g,'/')===date);
  const technical=controlIndex<0?null:number(control[controlIndex]?.[person.column]);
  const col=dayCols.get(day);
  const reported=activityRow&&col!==undefined?number(activityRow[col]):null;
  const friday=isFridayJalali({y:year,m:month,d:day});
  const status=technical===null||reported===null?(friday?'holiday':'missing'):technical===reported?'equal':'mismatch';
  return {day,name:person.name,activity:person.activity,technical,reported,delta:reported===null||technical===null?null:reported-technical,status,
    technicalCell:controlIndex>=0?`${'BCDEF'[person.column-1]}${controlIndex+1}`:null,
    staffCell:rowIndex>0&&col!==undefined?`${col<26?String.fromCharCode(65+col):'A'+String.fromCharCode(65+col-26)}${rowIndex}`:null};
 }));
}
export async function readStaffReconciliation(year:number,month:number,claims:unknown){
 const headers=authorizedSheetHeaders(claims);
 const meta=await read<{sheets?:{properties?:{title?:string}}[]}>(`${BASE}/spreadsheets/${STAFF_ID}?fields=sheets(properties(title))`,headers);
 const titles=(meta.sheets??[]).map(x=>x.properties?.title).filter((x):x is string=>!!x);
 const tab=monthTitle(titles,month);
 if(!tab)return {tab:null,rows:[],error:'د میاشتې ټب ونه موندل شو'};
 const ranges=[{id:CONTROL_ID,range:"'کنټرول'!A1:G380"},{id:STAFF_ID,range:`'${tab.replace(/'/g,"''")}'!A1:AM120`}];
 const values=await Promise.all(ranges.map(async x=>{
  const data=await read<{values?:unknown[][]}>(`${BASE}/spreadsheets/${x.id}/values/${encodeURIComponent(x.range)}?valueRenderOption=FORMATTED_VALUE`,headers);
  return data.values??[];
 }));
 return {tab,rows:compareStaff(values[0]??[],values[1]??[],year,month),error:null};
}
