import type { DashboardContext } from './dashboard-permissions.server';
import { authorizedSheetHeaders } from './sheets-access.server';
import { findMonthlyBlock, reportNumber } from './reconciliation';
import { todayJalali } from './jalali';
const ID = '1CQW-MelUxvRSGqbRMatozoVkrCZlhcgxluhBscsQM0Q';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const CENTERS = ['دارالامان آسان خدمت','امکا آسان خدمت','آسان خدمت (VIP)','افشار آسان خدمت','د احمد شاه بابا مېنې مرکز','سرای شمالي مرکز','دشت برچي مرکز','دارالامان مرکز','خوشحال خان مرکز','سینما پامير مرکز','کارتې پروان مرکز','شهدا و معلولین مرکز','قره باغ مرکز'];
type CenterQualityReport = {
 year: number;
 month: number;
 centers: {
  name: string;
  status: string;
  days: { day: number; value: number | null }[];
  total: number;
  reportedDays: number;
  complete: boolean;
  reportedMonths: number;
 }[];
 checkedAt: number;
};
const cache = new Map<string,{time:number;data:CenterQualityReport}>();
export async function readCenterQuality(year:number,month:number,context: DashboardContext,refresh:boolean) {
 const headers = await authorizedSheetHeaders(context, "center-quality");
 const key = context.userId+':'+year+':'+month;
 const old = cache.get(key);
 if(old && Date.now()-old.time < (refresh?30000:120000)) return old.data;
 const params = new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});
 for(const name of CENTERS) params.append('ranges',`'${name.replace(/'/g,"''")}'!A1:AL800`);
 const response = await fetch(`${GATEWAY}/spreadsheets/${ID}/values:batchGet?${params}`,{headers,signal:AbortSignal.timeout(30000)});
 if(!response.ok) throw new Error(response.status===429?'GOOGLE_RATE_LIMIT':'CENTER_REPORT_UNAVAILABLE');
 const body = await response.json() as {valueRanges?:{values?:unknown[][]}[]};
 const today = todayJalali();
 const months = month===0 ? Array.from({length:12},(_,i)=>i+1) : [month];
 const centers = CENTERS.map((name,index)=>{
   const grid=body.valueRanges?.[index]?.values??[];
   const monthly = months.map(m=>{
     const block=findMonthlyBlock(grid,year,m,'province',today.y);
     const quality=block.metrics.get('quality');
     const days=m<=6?31:m<=11?30:30;
     const daily=Array.from({length:days},(_,i)=>{
       const day=i+1, col=block.days.get(day);
       const future=year>today.y || (year===today.y&&(m>today.m||(m===today.m&&day>today.d)));
       const value=quality&&col!==undefined&&!future?reportNumber(quality.cells[col]):null;
       return {day,value:value?.value??null};
     });
     const reported=daily.filter(x=>x.value!==null);
     return {month:m,status:block.status,days:daily,total:reported.reduce((sum,x)=>sum+(x.value??0),0),reportedDays:reported.length,complete:block.status==='available'&&!!quality};
   });
   const reportedDays=monthly.reduce((sum,m)=>sum+m.reportedDays,0);
   return {name,status:monthly.some(m=>m.complete)?'available':'month_missing',days:month===0?[]:monthly[0]?.days??[],total:monthly.reduce((sum,m)=>sum+m.total,0),reportedDays,complete:monthly.every(m=>m.complete),reportedMonths:monthly.filter(m=>m.reportedDays>0).length};

 });
 const result={year,month,centers,checkedAt:Date.now()};
 if(cache.size>12) cache.clear();
 cache.set(key,{time:Date.now(),data:result});
 return result;
}
