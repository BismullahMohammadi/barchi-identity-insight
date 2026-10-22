import { formatJ, jKey, type JDate } from "./jalali";
import { isTotalRow, normalizeGrid, type NormalizedTable } from "./normalize";

type SourceTab = {slug:string;title:string;grid:string[][]};
export type DailyAdvice = { date:string; title:string; message:string; comparison:string|null; hasReport:boolean };

function dayValue(table: NormalizedTable, date:JDate, metric:number): number|null {
  const rows=table.rows.filter((row,i)=>table.dates[i] && jKey(table.dates[i]!)===jKey(date) && !isTotalRow(row));
  const values=rows.map(r=>r[metric]).filter((v):v is number=>typeof v==="number");
  return values.length?values.reduce((sum,v)=>sum+v,0):null;
}
function precedingRecordedDay(table:NormalizedTable, target:JDate, metric:number):{date:JDate;value:number}|null {
  const candidates=table.dates.filter((date):date is JDate=>date!==null && jKey(date)<jKey(target));
  const prior=candidates.sort((a,b)=>jKey(b)-jKey(a))[0];
  if(!prior) return null;
  const value=dayValue(table,prior,metric);
  return value===null?null:{date:prior,value};
}
/** Strictly use yesterday's report. A missing day must never appear as zero or as today's advice. */
export function buildYesterdayAdvice(tabs:SourceTab[],yesterday:JDate):DailyAdvice {
  const date=formatJ(yesterday);
  const source=tabs.find(t=>t.slug==="total");
  if(!source) return {date,title:"د راپور انتظار",message:"د مجموعي راپور معلومات لا نه دي ترلاسه شوي؛ د پرون له راپور پرته دقیقه مشوره نه شي جوړېدای.",comparison:null,hasReport:false};
  try {
    const table=normalizeGrid(source.grid,source.title);
    const count=dayValue(table,yesterday,3);
    if(count===null) return {date,title:"د پرون راپور نه دی ثبت شوی",message:"لومړی د پرون مجموعي راپور په Google Sheets کې تایید کړئ. د ناموجود راپور لپاره اټکلي تحلیل نه وړاندې کېږي.",comparison:null,hasReport:false};
    const prev=precedingRecordedDay(table,yesterday,3);
    const comparison=prev? "له "+formatJ(prev.date)+" سره پرتله":null;
    const delta=prev && prev.value>0?Math.round((count-prev.value)*100/prev.value):null;
    const control=tabs.find(t=>t.slug==="control");
    let controlSummary="";
    if(control) {
      try {
        const controlTable=normalizeGrid(control.grid,control.title);
        const verified=dayValue(controlTable,yesterday,6);
        if(verified!==null) controlSummary=" د کنټرول په راپور کې "+verified.toLocaleString("fa-AF")+" ثبت شوي دي.";
      } catch {/* A bad secondary schema must not suppress the main report. */}
    }
    if(delta!==null && delta<=-20) return {date,title:"د فعالیت کموالی",message:"پرون "+count.toLocaleString("fa-AF")+" تذکرې پاس شوې؛ د مخکیني ثبت شوي راپور په پرتله "+Math.abs(delta)+"٪ کموالی دی. د کار جریان او ځنډونه وڅېړئ."+controlSummary,comparison,hasReport:true};
    if(delta!==null && delta>=20) return {date,title:"د فعالیت ښه والی",message:"پرون "+count.toLocaleString("fa-AF")+" تذکرې پاس شوې؛ د مخکیني ثبت شوي راپور په پرتله "+delta+"٪ زیاتوالی دی. د پرمختګ لاملونه ثبت کړئ."+controlSummary,comparison,hasReport:true};
    return {date,title:"د ورځې مدیریتي لنډیز",message:"پرون "+count.toLocaleString("fa-AF")+" تذکرې پاس شوې. د نن د کار د ښه تنظیم لپاره د کنټرول او توزیع پاتې موارد وارزوئ."+controlSummary,comparison,hasReport:true};
  } catch {
    return {date,title:"د راپور د تایید اړتیا",message:"د مجموعي راپور جوړښت له تایید شوې بڼې سره سمون نه لري؛ له تایید مخکې مشوره نه وړاندې کېږي.",comparison:null,hasReport:false};
  }
}
