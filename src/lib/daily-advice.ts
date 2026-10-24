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
    const distribution=tabs.find(t=>t.slug==="distribution");
    let controlCount:number|null=null;
    let distributionCount:number|null=null;
    if(control) {
      try {controlCount=dayValue(normalizeGrid(control.grid,control.title),yesterday,6);}
      catch {/* Keep advice based only on validated metrics. */}
    }
    if(distribution) {
      try {distributionCount=dayValue(normalizeGrid(distribution.grid,distribution.title),yesterday,3);}
      catch {/* Do not infer missing quantities. */}
    }
    const details=["پاس شوې: "+count.toLocaleString("fa-AF")];
    if(controlCount!==null)details.push("کنټرول: "+controlCount.toLocaleString("fa-AF"));
    if(distributionCount!==null)details.push("توزیع: "+distributionCount.toLocaleString("fa-AF"));
    const summary="د پرون ثبت شوي ارقام — "+details.join("؛ ")+".";

    // Comparing control and passed only supports an investigation, not a claim of an error.
    if(controlCount!==null && count!==controlCount){
      return {date,title:"د راپورونو د تطبیق وړاندیز",message:summary+" د کنټرول او پاس شويو شمېرې "+Math.abs(count-controlCount)+" توپیر لري. د دواړو راپورونو د تعریف او ثبت وخت تایید کړئ، بیا یې په اړوند ټیم کې وڅېړئ.",comparison,hasReport:true};
    }
    if(delta!==null && delta<=-20){
      return {date,title:"د فعالیت کموالی",message:summary+" د مخکیني ثبت شوي راپور په پرتله "+Math.abs(delta)+"٪ کموالی دی. د نن لپاره د ثبت، کنټرول او چاپ ځنډونه وګورئ او د ستونزې مسئول وټاکئ.",comparison,hasReport:true};
    }
    if(delta!==null && delta>=20){
      return {date,title:"د فعالیت ښه والی",message:summary+" د مخکیني ثبت شوي راپور په پرتله "+delta+"٪ زیاتوالی دی. د ښه فعالیت لاملونه له ټیمونو سره شریک او د دوام لپاره یې ثبت کړئ.",comparison,hasReport:true};
    }
    if(count===0){
      return {date,title:"د صفر فعالیت د علت ارزونه",message:summary+" که پرون رسمي رخصتي نه وه، د فعالیت د نه ثبتېدو علت معلوم کړئ. له شیټ څخه یوازې د صفر ثبتېدو پخلی کېږي.",comparison,hasReport:true};
    }
    return {date,title:"د نن لپاره مدیریتي وړاندیز",message:summary+" د نن لومړیتوب دې د پاتې دوسیو، د کنټرول د کیفیت او د راپورونو د پر وخت ثبت کتنه وي.",comparison,hasReport:true};
  } catch {
    return {date,title:"د راپور د تایید اړتیا",message:"د مجموعي راپور جوړښت له تایید شوې بڼې سره سمون نه لري؛ له تایید مخکې مشوره نه وړاندې کېږي.",comparison:null,hasReport:false};
  }
}
