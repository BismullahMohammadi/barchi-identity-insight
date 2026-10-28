import type {JDate} from "./jalali";
import {formatJ,toLatinDigits} from "./jalali";
import {MONTH_NAMES} from "./monthly-staff-completeness";
const txt=(v:unknown)=>v===null||v===undefined?"":String(v).trim();
export type StateReport={date:string;month:string;status:"available"|"missing"|"invalid";rows:{label:string;value:string}[];message:string};
export function extractStateReport(grid:unknown[][],date:JDate):StateReport{
 const base={date:formatJ(date),month:MONTH_NAMES[date.m]??""};
 const unavailable=(message:string,status:"missing"|"invalid"="missing"):StateReport=>({...base,status,rows:[],message});
 if(!grid.length)return unavailable("د ریاست ته ګزارش ټاب معلومات نشته.");
 // Source has distinct monthly sections. Each starts with an A-cell title and B..AF daily headings.
 const monthName=MONTH_NAMES[date.m];
 const index=grid.findIndex(row=> {
  const title=toLatinDigits(txt(row[0])).replace(/\s+/g,"");
  return title.includes("بخشونه") && title.includes(monthName) &&
   (title.includes(String(date.m))||title.includes(String(date.m).replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)])));
 });
 if(index<0)return unavailable("د دې میاشتې برخه په «ریاست ته ګزارش» کې نه ده موندل شوې.");
 const header=grid[index]??[];
 const col=header.findIndex((v,i)=>i>0&&Number(toLatinDigits(txt(v)))===date.d);
 if(col<0)return unavailable("د تېرې ورځې کالم د ریاست په راپور کې نشته.");
 const rows:{label:string;value:string}[]=[];
 for(const row of grid.slice(index+1)){
  const name=txt(row[0]);
  if(!name||name.includes("بخشونه"))break;
  rows.push({label:name,value:txt(row[col])});
 }
 if(!rows.length)return unavailable("د تېرې ورځې د ریاست راپور معلومات نشته.");
 if(rows.some(r=>!r.value||/^#(?:NAME\?|REF!|DIV\/0!|VALUE!|N\/A|NUM!|ERROR!|NULL!)/i.test(r.value)))
  return unavailable("د ریاست په راپور کې تشې خانې یا د فورمول تېروتنې شته؛ غلط راپور نه کاپي کېږي.","invalid");
 return {...base,status:"available",rows,message:"د ریاست د تېرې ورځې ګزارش د کاپي کولو لپاره چمتو دی."};
}
/** Excel-friendly two-column TSV preserving the original source row order and labels. */
export function stateReportTsv(report:StateReport):string{
 if(report.status!=="available")return "";
 return [["بخشونه ("+report.month+" "+report.date+")","شمېر"],...report.rows.map(r=>[r.label,r.value])]
  .map(row=>row.map(x=>x.replace(/[\t\r\n]/g," ")).join("\t")).join("\n");
}
