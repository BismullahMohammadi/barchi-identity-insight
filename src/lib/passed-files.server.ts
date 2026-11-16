import { authorizedSheetHeaders } from './sheets-access.server';
import { toLatinDigits } from './jalali';
const BASE='https://connector-gateway.lovable.dev/google_sheets/v4';
const SOURCES=[
 {name:'عزیزالله الطاف',id:'1jnl7NQez_2Sv-0tuODos5STHh3FK8h4Krm2PJawKadg'},
 {name:'فاطمه علي رضایي',id:'1k0eMorAul-58fe-E8dst3bs7_7sG6uV0b116vX8reDQ'},
 {name:'نېک ولي خان ایمان',id:'1L7MCDdv-MDZurkJW3D7EoS56MXV_GnsaaVMoWs9TKo4'},
 {name:'محمد نبي بهزاد',id:'1qaHLLc0e1lA3T1FnPoT1D6BUq-aO5JS_xwb_p2X0-vI'},
 {name:'محمد نسیم هاشمي',id:'1TKHUyfnkr6uQaePIISt2fBJ7AB2YpMujM5OHqtoNBJQ'}
];
const norm=(v:unknown)=>toLatinDigits(String(v??'')).replace(/[يى]/g,'ی').replace(/ك/g,'ک').trim();
const dateRegex=/(1[34]\d{2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})/;
function valid(y:number,m:number,d:number){return y>=1300&&y<=1499&&m>=1&&m<=12&&d>=1&&d<=(m<=6?31:m<=11?30:30)}
function fullDate(value:unknown){const m=norm(value).match(dateRegex);if(!m)return null;const [y,mo,d]=m.slice(1).map(Number);return valid(y,mo,d)?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
function noteDate(value:unknown,year:number){const s=norm(value);const full=fullDate(s);if(full)return full;const m=s.match(/(?:^|\s)(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?=\s|$)/);if(!m)return null;const mo=Number(m[1]),d=Number(m[2]);return valid(year,mo,d)?`${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
function initialDate(title:string){const matches=[...norm(title).matchAll(/1[34]\d{2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{1,2}/g)].map(m=>fullDate(m[0])).filter((x):x is string=>!!x);return matches[0]??null}
async function read<T>(url:string,headers:Record<string,string>):Promise<T>{const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000),cache:'no-store'});if(!r.ok)throw Error('SHEETS_READ_'+r.status);return r.json() as Promise<T>}
export async function readPassedFiles(date:string,claims:unknown){
 const target=fullDate(date);if(!target||target!==date)throw Error('INVALID_DATE');
 const headers=authorizedSheetHeaders(claims);const [year,month]=target.split('-').map(Number);
 const records:{employee:string;name:string;father:string;familyCode:string;province:string;familyForms:number|null;individualForms:number|null;date:string;sourceUrl:string;tab:string;row:number;confidence:string}[]=[];
 const warnings:string[]=[];let scanned=0;
 await Promise.all(SOURCES.map(async source=>{
  try{
   const meta=await read<{sheets?:{properties?:{title?:string;sheetId?:number}}[]}>(`${BASE}/spreadsheets/${source.id}?fields=sheets(properties(title,sheetId))`,headers);
   const tabs=(meta.sheets??[]).map(s=>s.properties).filter((p):p is {title:string;sheetId:number}=>typeof p?.title==='string'&&typeof p?.sheetId==='number');
   // Include date-bearing tabs in the target month through the selected day, plus the most recent preceding tab.
   const relevant=tabs.filter(t=>{const d=initialDate(t.title);return d&&d.slice(0,7)===target.slice(0,7)&&d<=target}).sort((a,b)=>(initialDate(b.title)??'').localeCompare(initialDate(a.title)??''));
   const selected=relevant.slice(0,18);
   if(relevant.length>selected.length)warnings.push(`${source.name}: ${relevant.length-selected.length} زاړه ټبونه نه دي پلټل شوي`);
   if(!selected.length)warnings.push(`${source.name}: د ټاکلې میاشتې د نېټې لرونکی ټب ونه موندل شو`);
   await Promise.all(selected.map(async tab=>{
    try{
     const range=`'${tab.title.replace(/'/g,"''")}'!A1:P150`;
     const data=await read<{values?:unknown[][]}>(`${BASE}/spreadsheets/${source.id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,headers);
     scanned++;const grid=data.values??[];
     let header=-1;
     for(let i=0;i<Math.min(grid.length,18);i++)if(grid[i]?.some(x=>/اسم و تخلص/.test(norm(x)))){header=i;break}
     if(header<0){warnings.push(`${source.name} / ${tab.title}: سرلیکونه ونه موندل شول`);return}
     const main=grid[header-1]??[];const codeCol=main.findIndex(x=>/ک[دو]د فامیلی/.test(norm(x)));
     const familyCol=codeCol>=0?codeCol:3;
     const provinceCol=main.findIndex(x=>/ولایت/.test(norm(x)));
     const second=grid[header]??[];
     const familyFormsCol=second.findIndex(x=>/فورم فامیلی/.test(norm(x)));
     const individualFormsCol=second.findIndex(x=>/فورم انفرادی/.test(norm(x)));
     const qty=(v:unknown)=>/^\\d+$/.test(norm(v))?Number(norm(v)):null;
     const notesCol=main.findIndex(x=>/ملاحظات|تاریخ/.test(norm(x)));
     const start=initialDate(tab.title);
     let current=start;
     if(!start){warnings.push(`${source.name} / ${tab.title}: لومړنۍ نېټه ناڅرګنده ده`)}
     for(let i=header+1;i<grid.length;i++){
      const row=grid[i]??[];
      // A date marker changes the effective date for its own row and all following rows.
      const marked=notesCol>=0?noteDate(row[notesCol],year):null;
      if(marked)current=marked;
      const name=norm(row[1]),father=norm(row[2]),familyCode=norm(row[familyCol]);
      if(!name||!familyCode||!/^\d+$/.test(norm(row[0])))continue;
      if(current===target)records.push({employee:source.name,name,father,familyCode,province:provinceCol>=0?norm(row[provinceCol]):'',familyForms:familyFormsCol>=0?qty(row[familyFormsCol]):null,individualForms:individualFormsCol>=0?qty(row[individualFormsCol]):null,date:target,sourceUrl:`https://docs.google.com/spreadsheets/d/${source.id}/edit?gid=${tab.sheetId}&range=A${i+1}:L${i+1}`,tab:tab.title,row:i+1,confidence:marked?'explicit':'inherited'});
     }
    }catch(e){warnings.push(`${source.name} / ${tab.title}: لوستل ناکام شول`)}
   }));
  }catch(e){warnings.push(`${source.name}: د شیټ لاسرسی ناکام شو`)}
 }));
 return {date:target,rows:records.sort((a,b)=>a.employee.localeCompare(b.employee)||a.name.localeCompare(b.name)),count:records.length,scannedTabs:scanned,warnings};
}
