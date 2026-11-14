import { authorizedSheetHeaders } from './sheets-access.server';
import { findMonthlyBlock, reportNumber } from './reconciliation';
import { todayJalali } from './jalali';
const ID = '1CQW-MelUxvRSGqbRMatozoVkrCZlhcgxluhBscsQM0Q';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const CENTERS = ['آسان خدمت دارالامان','آسان خدمت امکا','آسان خدمت (VIP)','آسان خدمت افشار','مرکز احمد شاه بابا مینه','مرکز سرای شمالی','مرکز دشت برچی','مرکز قصر دارالمان','مرکز خوشحال خان','مرکز سینما پامیر','مرکز کارته پروان','شهدا و معلولین','مرکز قره باغ'];
const cache = new Map<string,{time:number;data:unknown}>();
export async function readCenterQuality(year:number,month:number,claims:unknown,userId:string,refresh:boolean) {
 const headers = authorizedSheetHeaders(claims);
 const key = userId+':'+year+':'+month;
 const old = cache.get(key);
 if(old && Date.now()-old.time < (refresh?30000:120000)) return old.data;
 const params = new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});
 for(const name of CENTERS) params.append('ranges',`'${name.replace(/'/g,"''")}'!A1:AL800`);
 const response = await fetch(`${GATEWAY}/spreadsheets/${ID}/values:batchGet?${params}`,{headers,signal:AbortSignal.timeout(30000)});
 if(!response.ok) throw new Error(response.status===429?'GOOGLE_RATE_LIMIT':'CENTER_REPORT_UNAVAILABLE');
 const body = await response.json() as {valueRanges?:{values?:unknown[][]}[]};
 const today = todayJalali();
 const days = month<=6?31:month<=11?30:30;
 const centers = CENTERS.map((name,index)=>{
   const grid=body.valueRanges?.[index]?.values??[];
   const block=findMonthlyBlock(grid,year,month,'province',today.y);
   const quality=block.metrics.get('quality');
   const daily=Array.from({length:days},(_,i)=>{
     const day=i+1, col=block.days.get(day);
     const future=year>today.y || (year===today.y&&(month>today.m||(month===today.m&&day>today.d)));
     const value=quality&&col!==undefined&&!future?reportNumber(quality.cells[col]):null;
     return {day,value:value?.value??null};
   });
   const reported=daily.filter(x=>x.value!==null);
   return {name,status:block.status,days:daily,total:reported.reduce((sum,x)=>sum+(x.value??0),0),reportedDays:reported.length,complete:block.status==='available'&&!!quality};
 });
 const result={year,month,centers,checkedAt:Date.now()};
 if(cache.size>12) cache.clear();
 cache.set(key,{time:Date.now(),data:result});
 return result;
}
