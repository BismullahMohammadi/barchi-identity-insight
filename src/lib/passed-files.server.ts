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
function fullDate(value:unknown){const m=norm(value).match(dateRegex);if(!m)return null;const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);return valid(y,mo,d)?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
function noteDate(value:unknown,year:number){const s=norm(value);const full=fullDate(s);if(full)return full;const m=s.match(/(?:^|\s)(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?=\s|$)/);if(!m)return null;const mo=Number(m[1]),d=Number(m[2]);return valid(year,mo,d)?`${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
function initialDate(title:string){const matches=[...norm(title).matchAll(/1[34]\d{2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{1,2}/g)].map(m=>fullDate(m[0])).filter((x):x is string=>!!x);return matches[0]??null}
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const cache=new Map<string,{expires:number;value:unknown}>();
const pending=new Map<string,Promise<unknown>>();
let queue:Promise<void>=Promise.resolve();
let nextRequestAt=0;
async function read<T>(url:string,headers:Record<string,string>):Promise<T>{
 const hit=cache.get(url);
 if(hit&&hit.expires>Date.now())return hit.value as T;
 const existing=pending.get(url);
 if(existing)return existing as Promise<T>;
 const task=(async()=>{
  let lastError:unknown;
  for(let attempt=0;attempt<5;attempt++){
   // Serialize gateway requests across simultaneous searches in this server process.
   let release!:()=>void;
   const previous=queue;
   queue=new Promise<void>(resolve=>{release=resolve});
   let response:Response|undefined;
   try{
    await previous;
    await delay(Math.max(0,nextRequestAt-Date.now()));
    nextRequestAt=Date.now()+300;
    response=await fetch(url,{headers,signal:AbortSignal.timeout(30000),cache:'no-store'});
   }catch(e){lastError=e}
   finally{release()}
   if(response?.ok){
    const value=await response.json() as T;
    cache.set(url,{value,expires:Date.now()+(url.includes('/values/')?60000:300000)});
    if(cache.size>500)for(const [key,item] of cache)if(item.expires<Date.now())cache.delete(key);
    return value;
   }
   if(response){
    lastError=Error('SHEETS_HTTP_'+response.status);
    if(![429,500,502,503,504].includes(response.status))throw lastError;
   }
   if(attempt<4){
    const retryAfter=Number(response?.headers.get('retry-after')??'');
    const wait=Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,30000):Math.min(1500*2**attempt,15000);
    nextRequestAt=Math.max(nextRequestAt,Date.now()+wait);
    await delay(wait);
   }
  }
  throw lastError??Error('SHEETS_UNAVAILABLE');
 })();
 pending.set(url,task);
 try{return await task as T}finally{pending.delete(url)}
}

export async function readPassedFiles(from:string,to:string,claims:unknown,query=''){
 const search=norm(query).toLowerCase().replace(/\s+/g,'');
 const target=fullDate(to);const startDate=fullDate(from);if(!target||target!==to||!startDate||startDate!==from||startDate>target)throw Error('INVALID_DATE');
 const headers=authorizedSheetHeaders(claims);const [year,month]=target.split('-').map(Number);
 const records:{employee:string;name:string;father:string;familyCode:string;province:string;familyForms:number|null;individualForms:number|null;workType:string;date:string;sourceUrl:string;tab:string;row:number;confidence:string}[]=[];
 const warnings:string[]=[];let scanned=0;
 for(const source of SOURCES){
  try{
   const meta=await read<{sheets?:{properties?:{title?:string;sheetId?:number}}[]}>(`${BASE}/spreadsheets/${source.id}?fields=sheets(properties(title,sheetId))`,headers);
   const tabs=(meta.sheets??[]).map(s=>s.properties).filter((p):p is {title:string;sheetId:number}=>typeof p?.title==='string'&&typeof p?.sheetId==='number');
   // Include date-bearing tabs in the target month through the selected day, plus the most recent preceding tab.
   const dated=tabs.filter(t=>initialDate(t.title)).sort((a,b)=>(initialDate(a.title)??'').localeCompare(initialDate(b.title)??''));
   // Include tabs starting inside the interval and the preceding tab, which can contain later marked dates.
   const preceding=dated.filter(t=>(initialDate(t.title)??'')<startDate).slice(-2);
   const relevant=search?tabs:[...preceding,...dated.filter(t=>{const d=initialDate(t.title)!;return d>=startDate&&d<=target})];
   const selected=relevant;
   if(relevant.length>selected.length)warnings.push(`${source.name}: ${relevant.length-selected.length} زاړه ټبونه نه دي پلټل شوي`);
   if(!selected.length)warnings.push(`${source.name}: د ټاکلې میاشتې د نېټې لرونکی ټب ونه موندل شو`);
   const ranges=selected.map(tab=>`'${tab.title.replace(/'/g,"''")}'!A1:P600`);
   let batch:{valueRanges?:{values?:unknown[][]}[]}|null=null;
   if(ranges.length){
    try{batch=await read<{valueRanges?:{values?:unknown[][]}[]}>(`${BASE}/spreadsheets/${source.id}/values:batchGet?${ranges.map(range=>`ranges=${encodeURIComponent(range)}`).join('&')}&valueRenderOption=FORMATTED_VALUE`,headers)}catch{batch=null}
   }
   for(const [tabIndex,tab] of selected.entries()){
    try{
     const range=ranges[tabIndex];
     if(range===undefined)throw Error('SHEET_RANGE_MISSING');
     const data=batch?.valueRanges?.[tabIndex]??await read<{values?:unknown[][]}>(`${BASE}/spreadsheets/${source.id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,headers);
     scanned++;const grid=data.values??[];
     let header=-1;
     for(let i=0;i<Math.min(grid.length,18);i++)if(grid[i]?.some(x=>/اسم و تخلص/.test(norm(x)))){header=i;break}
     if(header<0){warnings.push(`${source.name} / ${tab.title}: سرلیکونه ونه موندل شول`);continue}
     const main=grid[header-1]??[];const codeCol=main.findIndex(x=>/ک[دو]د فامیلی/.test(norm(x)));
     const familyCol=codeCol>=0?codeCol:(source.name==='محمد نسیم هاشمي'?4:3);
     const provinceCol=main.findIndex(x=>/ولایت/.test(norm(x)));
     const second=grid[header]??[];
     const familyFormsCol=second.findIndex(x=>/فورم فامیلی/.test(norm(x)));
     const individualFormsCol=second.findIndex(x=>/فورم انفرادی/.test(norm(x)));
     const workTypeCol=main.findIndex(x=>/نوع کار|د کار ډول/.test(norm(x)))>=0?main.findIndex(x=>/نوع کار|د کار ډول/.test(norm(x))):second.findIndex(x=>/نوع کار|د کار ډول/.test(norm(x)));
     const qty=(v:unknown)=>/^\d+$/.test(norm(v))?Number(norm(v)):null;
     const notesCol=[...main,...second].findIndex((x,i)=>i<main.length&&/ملاحظات|تاریخ/.test(norm(x)))>=0?main.findIndex(x=>/ملاحظات|تاریخ/.test(norm(x))):second.findIndex(x=>/ملاحظات|تاریخ/.test(norm(x)));
     const noteIndex=notesCol>=0?notesCol:(source.name==='محمد نبي بهزاد'?10:11);
     if(notesCol<0)warnings.push(`${source.name} / ${tab.title}: د نېټې یا ملاحظاتو ستون ونه موندل شو`);
     const start=initialDate(tab.title);
     let current=start;
     if(!start){warnings.push(`${source.name} / ${tab.title}: لومړنۍ نېټه ناڅرګنده ده`)}
     for(let i=header+1;i<grid.length;i++){
      const row=grid[i]??[];
      // A date marker changes the effective date for its own row and all following rows.
      const marked=noteDate(row[noteIndex],Number((start??target).slice(0,4)));
      if(marked)current=marked;
      const name=norm(row[1]),father=norm(row[2]),familyCode=norm(row[familyCol]);
      if(!name||!familyCode||!/^\d+$/.test(norm(row[0])))continue;
      if((search?([name,familyCode].some(v=>norm(v).toLowerCase().replace(/\s+/g,'').includes(search))):(current&&current>=startDate&&current<=target)))records.push({employee:source.name,name,father,familyCode,province:provinceCol>=0?norm(row[provinceCol]):'',familyForms:familyFormsCol>=0?qty(row[familyFormsCol]):null,individualForms:individualFormsCol>=0?qty(row[individualFormsCol]):null,workType:source.name==='محمد نبي بهزاد'&&workTypeCol>=0?norm(row[workTypeCol]):'',date:current??'',sourceUrl:`https://docs.google.com/spreadsheets/d/${source.id}/edit?gid=${tab.sheetId}&range=A${i+1}:L${i+1}`,tab:tab.title,row:i+1,confidence:marked?'explicit':'inherited'});
     }
    }catch(e){warnings.push(`${source.name} / ${tab.title}: لوستل ناکام شول (${String(e).slice(0,100)})`)}
   }
  }catch(e){warnings.push(`${source.name}: د شیټ لاسرسی ناکام شو (${String(e).slice(0,100)})`)}
 }
 return {date:target,from:startDate,to:target,rows:records.sort((a,b)=>a.employee.localeCompare(b.employee)||a.name.localeCompare(b.name)),count:records.length,scannedTabs:scanned,warnings};
}
