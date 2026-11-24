import { RotatingTazkira } from "@/components/DashboardArtwork";
import { useSectionActions } from "@/lib/dashboard-access-context";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Link} from "@tanstack/react-router";
import {useServerFn} from "@tanstack/react-start";
import {Settings2,RefreshCw,RotateCcw,Table2,FileSpreadsheet,ShieldCheck,Check,Activity,Users,BarChart3,PanelsTopLeft,ListTodo,AlertTriangle,LoaderCircle,Wrench} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {useDashboardSettings,saveDashboardSettings,resetDashboardSettings,type DashboardSettings} from "@/lib/dashboard-settings";
import {SHEET_COLUMNS} from "@/lib/sheet-columns";
import {readAliases,COLUMN_ALIAS_KEY,type HeaderAliases} from "@/lib/sheet-mapping-preferences";
import {accessQuery} from "@/lib/queries";
import {getDailyForms,getDailyCoordination,getSheetTabs} from "@/lib/sheets.functions";
import {getReconciliation} from "@/lib/reconciliation.functions";
import {getDieselSheetReport} from "@/lib/diesel-sheet.functions";
import {getCenterQuality} from "@/lib/center-quality.functions";
import {getStaffReconciliation} from "@/lib/staff-reconciliation.functions";
import {getStaffDailyCompleteness,getInsijamDailyCompleteness,getStateReportForYesterday} from "@/lib/sheets.functions";
import {getPassedFiles} from "@/lib/passed-files.functions";
import {getProblemVisitorSheetHealth} from "@/lib/problem-visitors.functions";
import {JALALI_MONTHS,formatJ,todayJalali,yesterdayJalali} from "@/lib/jalali";
import {errorText} from "@/lib/queries";
import {TABS} from "@/lib/tabs";
import {resolveMappedGrid} from "@/lib/sheet-mapping-preferences";
import {normalizeGrid} from "@/lib/normalize";
import {REFERRAL_CELL_KEY,REGISTRATION_CELL_KEY,normalizeReferralCell,readReferralCellPreference,readSourceCell} from "@/lib/referral-cell";

type Section="general"|"reports"|"sheets"|"account";
type SheetSettingsView="health"|"daily"|"comparison"|"mapping";
type SourceCheck={status:"idle"|"checking"|"ok"|"warning"|"error";message:string;checkedAt:number|null};
type SourceCheckResult=string|{status:"ok"|"warning";message:string};
const sections=[{id:"general",label:"عمومي",Icon:Settings2},{id:"reports",label:"راپورونه او جدولونه",Icon:Table2},{id:"sheets",label:"Google Sheets",Icon:FileSpreadsheet},{id:"account",label:"حساب او ساتنه",Icon:ShieldCheck}] as const;
const MAPPED_TABS=TABS.filter(tab=>SHEET_COLUMNS[tab.title]);
const RECONCILIATION_HEADER_ROWS_KEY="barchi-reconciliation-header-rows-v1";
type HeaderRows={local:string;province:string};
function reconciliationHeaderRowKey(year:number,month:number){return `${year}-${month}`;}
function readReconciliationHeaderRows(year:number,month:number):HeaderRows{
 try{
  const all=JSON.parse(window.localStorage.getItem(RECONCILIATION_HEADER_ROWS_KEY)||"{}");
  const saved=all?.[reconciliationHeaderRowKey(year,month)]??{};
  const value=(row:unknown)=>typeof row==="number"&&Number.isInteger(row)&&row>=1&&row<=2000?String(row):"";
  return {local:value(saved?.local),province:value(saved?.province)};
 }catch{return {local:"",province:""};}
}
function parseHeaderRow(value:string):number|undefined{
 if(!value.trim())return undefined;
 const row=Number(value);
 if(!Number.isInteger(row)||row<1||row>2000)throw new Error("د سرلیک قطار باید له ۱ تر ۲۰۰۰ پورې وي.");
 return row;
}
type SourceDiagnostic={error:{code:string;status:number|null;retryAt:number|null}|null;block:string;headingRow:number|null;dayHeaderRow:number|null;mapped:number;unmapped:number;ambiguous:number;totalHeaderStatus:string};
type ReconciliationDiagnostic={year:number;month:number;local:SourceDiagnostic;province:SourceDiagnostic;stale:boolean};
function reconciliationSourceText(source:SourceDiagnostic){
 if(source.error?.code==="rate_limited")return "د Google غوښتنې محدودې شوې؛ لږ وروسته بیا هڅه وکړئ.";
 if(source.error?.code==="tab_missing")return "د راپور ټب ونه موندل شو؛ د سرچینې ټب نوم وګورئ.";
 if(source.error?.code==="network_error")return "له Google Sheets سره شبکه يي اړیکه ناکامه شوه.";
 if(source.error?.status===403)return "د Sheet لوستلو اجازه نشته؛ د Google اتصال لاسرسی وګورئ.";
 if(source.error?.status===404)return "Sheet یا ټب ونه موندل شو؛ د راپور سرچینه وګورئ.";
 if(source.error)return `لوستل ناکام شول (${source.error.status??source.error.code}).`;
 if(source.block==="month_missing")return "د ټاکل شوې میاشتې سرلیک ونه موندل شو.";
 if(source.block==="ambiguous_month")return "د میاشتې څو سرلیکونه وموندل شول؛ یوازې یو فعال سرلیک وساتئ.";
 if(source.block==="day_header_missing")return "د ورځې کالمونه ونه پېژندل شول؛ د میاشتې د سرلیک قطار وازمویئ.";
 if(source.ambiguous)return `${source.ambiguous} برخې تکراري یا مبهمې دي.`;
 if(!source.mapped)return "د راپور برخې ونه پېژندل شوې.";
 return `${source.mapped} برخې پېژندل شوې${source.unmapped?`; ${source.unmapped} نورې نه دي پېژندل شوې`:""}.`;
}
function sheetSourceError(error:unknown){
 const message=String((error as Error)?.message??error);
 if(message.includes("SHEET_MAPPING_MISMATCH")||message.includes("COLUMN_MAPPING_REQUIRED")||message.includes("AMBIGUOUS_COLUMN"))return "د Sheet سرلیک یا کالم بدل شوی؛ د «راپور او کالمونه» برخه کې یې وازمویئ او برابر کړئ.";
 if(message.includes("CENTER_REPORT_UNAVAILABLE"))return "د مرکزونو Sheet لوستل ناکام شول؛ د اتصال، workbook او د مرکزونو ټب نومونه وګورئ.";
 if(message.includes("DIESEL_SHEET_ERROR_403"))return "د Google Sheet لوستلو اجازه نشته؛ د اتصال لاسرسی وګورئ.";
 if(message.includes("DIESEL_SHEET_ERROR_404"))return "د ډیزل ټب ونه موندل شو؛ د ټب نوم وګورئ.";
 if(message.includes("DIESEL_SHEET_FORMAT_CHANGED"))return "د ډیزل د سرلیکونو جوړښت بدل شوی؛ د Sheet د کالمونو نقشه وګورئ.";
 if(message.includes("DIESEL_SHEET_EMPTY"))return "د ډیزل ټب تش دی.";
 if(message.includes("DIESEL_NETWORK_FAILED"))return "د ډیزل Sheet سره شبکه يي اړیکه ناکامه شوه.";
 if(message.includes("VISITOR_SHEET_UNAVAILABLE_403"))return "د problem-visitors Sheet لوستلو اجازه نشته؛ د Google اتصال لاسرسی وګورئ.";
 if(message.includes("VISITOR_SHEET_UNAVAILABLE_404"))return "د problem-visitors Sheet ونه موندل شو.";
 if(message.includes("VISITOR_SHEET_HEADER"))return "د problem-visitors Sheet سرلیکونه نه پېژندل کېږي؛ د سرلیک نومونه بېرته سم کړئ.";
 return errorText(error);
}
function SourceCheckCard({title,description,permission,status,onTest,onRepair}: {title:string;description:string;permission:boolean;status:SourceCheck;onTest:()=>void;onRepair?:()=>void}){
 return <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex min-w-0 items-start gap-2"><div className="mt-0.5 shrink-0">{status.status==="checking"?<LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-label="ازموینه روانه ده"/>:status.status==="ok"?<Check className="h-4 w-4 text-primary" aria-label="سمه ده"/>:status.status==="warning"||status.status==="error"?<AlertTriangle className={`h-4 w-4 ${status.status==="error"?"text-destructive":"text-amber-600"}`} aria-label={status.status==="error"?"ستونزه":"بیاکتنې ته اړتیا"}/>:<FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden="true"/>}</div>
   <div className="min-w-0"><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p><p className={`mt-1 min-h-5 text-xs ${status.status==="error"?"text-destructive":status.status==="warning"?"text-amber-700":status.status==="ok"?"text-primary":"text-muted-foreground"}`} role={status.status==="error"?"alert":"status"}>{status.message|| (permission?"لا نه ده ازمویل شوې.":"دې سرچینې ته د لیدلو اجازه نشته.")}</p></div>
  </div>
  <div className="flex shrink-0 flex-wrap items-center gap-2"><Button className="min-h-11" size="sm" variant="outline" disabled={!permission||status.status==="checking"} onClick={onTest}><RefreshCw className={`h-4 w-4 ${status.status==="checking"?"animate-spin":""}`}/>{status.status==="checking"?"ازموینه روانه ده…":"اوس یې وازمویئ"}</Button>{onRepair&&(status.status==="error"||status.status==="warning")&&<Button className="min-h-11" size="sm" variant="ghost" onClick={onRepair}><Wrench className="h-4 w-4"/>اصلاح</Button>}{status.checkedAt&&<span className="text-[11px] tabular-nums text-muted-foreground">{new Date(status.checkedAt).toLocaleTimeString("ps-AF",{hour:"2-digit",minute:"2-digit"})}</span>}</div>
 </div>;
}
export function DashboardSettingsPage(){
 const can=useSectionActions("settings");
 const canDashboard=useSectionActions("dashboard");
 const canFuel=useSectionActions("fuel-management");
 const canCenterQuality=useSectionActions("center-quality");
 const canReconciliation=useSectionActions("reconciliation");
 const canControl=useSectionActions("control");
 const canProblemVisitors=useSectionActions("problem-visitors");
 const settings=useDashboardSettings();
 const access=useQuery(accessQuery);
 const qc=useQueryClient();
 const [tab,setTab]=useState<Section>("general");
 const [sheetView,setSheetView]=useState<SheetSettingsView>("health");
 const [busy,setBusy]=useState(false),[resetConfirm,setResetConfirm]=useState(false);
 const [saved,setSaved]=useState(false);
 const [sheet,setSheet]=useState(Object.keys(SHEET_COLUMNS).find(s=>s!=="ریاست ته ګزارش")??"");
 const [aliases,setAliases]=useState<HeaderAliases>(readAliases);
 const [aliasSaved,setAliasSaved]=useState(false);
 const [reportTest,setReportTest]=useState("");
 const [reportTestBusy,setReportTestBusy]=useState(false);
 const [referralCell,setReferralCell]=useState(readReferralCellPreference);
 const [cellBusy,setCellBusy]=useState(false);
 const [cellResult,setCellResult]=useState("");
 const [cellError,setCellError]=useState("");
 const [registrationCell,setRegistrationCell]=useState(()=>readSourceCell(REGISTRATION_CELL_KEY));
 const [registrationResult,setRegistrationResult]=useState("");
 const [registrationError,setRegistrationError]=useState("");
 const [registrationBusy,setRegistrationBusy]=useState(false);
 const [reconciliationMonth,setReconciliationMonth]=useState(()=>String(todayJalali().m));
 const [reconciliationDiagnostic,setReconciliationDiagnostic]=useState<ReconciliationDiagnostic|null>(null);
 const [reconciliationError,setReconciliationError]=useState("");
 const [reconciliationBusy,setReconciliationBusy]=useState(false);
 const [headerRows,setHeaderRows]=useState<HeaderRows>(()=>readReconciliationHeaderRows(todayJalali().y,todayJalali().m));
 const [sourceChecks,setSourceChecks]=useState<Record<string,SourceCheck>>({});
 const readReconciliation=useServerFn(getReconciliation);
 async function runSourceCheck(key:string,operation:()=>Promise<SourceCheckResult>){
  setSourceChecks(previous=>({...previous,[key]:{status:"checking",message:"سرچینه لوستل کېږي…",checkedAt:null}}));
  try{
   const result=await operation();
   const status=typeof result==="string"?"ok":result.status;
   const message=typeof result==="string"?result:result.message;
   setSourceChecks(previous=>({...previous,[key]:{status,message,checkedAt:Date.now()}}));
  }catch(error){
   setSourceChecks(previous=>({...previous,[key]:{status:"error",message:sheetSourceError(error),checkedAt:Date.now()}}));
  }
 }
 function checkFor(key:string):SourceCheck{return sourceChecks[key]??{status:"idle",message:"",checkedAt:null};}
 async function inspectMappedReport(title=sheet){
  const def=MAPPED_TABS.find(tab=>tab.title===title);
  if(!def)throw new Error("دا ټب د اصلي راپورونو whitelist کې نشته.");
  const result=await getSheetTabs({data:{slugs:[def.slug]}});
  const grid=result.tabs.find(tab=>tab.slug===def.slug)?.grid;
  if(!grid?.length)throw new Error("په Google Sheet کې معلومات ونه موندل شول.");
  const table=normalizeGrid(resolveMappedGrid(grid,def.title),def.title);
  return `${def.label} · ${table.rows.length} قطارونه · ${table.headers.length} کالمونه.`;
 }
 function canViewSection(section:string){return access.data?.owner===true||access.data?.permissions?.[section]?.includes("view")===true;}
 const sourceTests=[
  ...MAPPED_TABS.map(tab=>({key:`report-${tab.slug}`,title:tab.label,description:`اصلي Sheet ټب · ${tab.title}`,permission:canViewSection(tab.slug),repairView:"mapping" as const,repairSheet:tab.title,test:()=>inspectMappedReport(tab.title)})),
  {key:"reconciliation",title:"د مرکز او ریاست مطابقت",description:"د ټاکل شوې میاشتې دواړه راپورونه، سرلیکونه او مجموعې",permission:canReconciliation("view"),repairView:"comparison" as const,test:async()=>{const year=todayJalali().y,month=Number(reconciliationMonth);const rows={local:parseHeaderRow(headerRows.local),province:parseHeaderRow(headerRows.province)};const result=await readReconciliation({data:{year,month,refresh:true,headerRows:rows}});setReconciliationDiagnostic(result);qc.setQueryData(["reconciliation",year,month],result);const problems=[result.local,result.province].filter(source=>source.error||source.block!=="available"||source.ambiguous);return problems.length?{status:"warning",message:`زموږ راپور: ${reconciliationSourceText(result.local)} · د ریاست راپور: ${reconciliationSourceText(result.province)}`} : `د دواړو راپورونو ${month} میاشت او ${result.local.mapped+result.province.mapped} برخې ولوستل شوې.`;}},
  {key:"daily-forms",title:"ورځنۍ فورمې · مراجعین",description:"د ورځې ټب او د شمېر سیل",permission:canDashboard("view"),repairView:"daily" as const,test:async()=>{const result=await getDailyForms({data:{cell:normalizeReferralCell(referralCell),nonce:Date.now()}});if(!result.tabName)throw new Error("د نن ورځې د فورمو ټب ونه موندل شو.");return `${result.date??"ورځنی ټب"} · ${result.tabName} · سیل ${result.cell??"اتومات"}`;}},
  {key:"daily-coordination",title:"ورځنۍ ثبت‌نام همغږي",description:"د ورځې ټب او د ثبت شويو مراجعینو شمېر",permission:canDashboard("view"),repairView:"daily" as const,test:async()=>{const result=await getDailyCoordination({data:{cell:normalizeReferralCell(registrationCell),nonce:Date.now()}});if(!result.tabName)throw new Error("د نن ورځې د همغږۍ ټب ونه موندل شو.");return result.count?`${result.tabName} · ${result.count} ثبتونه`: {status:"warning",message:`${result.tabName} ولوستل شو، خو د شمېر سیل تش دی.`};}},
  {key:"diesel",title:"ډیزل",description:"د مصرف راپور او تحویلي ټبونه",permission:canFuel("view"),test:async()=>{const result=await getDieselSheetReport({data:{nonce:Date.now()}});return `${result.records.length} د مصرف ریکارډونه · ${result.deliveries.length} تحویلي ثبتونه`; }},
  {key:"center-quality",title:"د مرکزونو کیفیت",description:"د مرکزونو ورځني کیفیتي شمېرې",permission:canCenterQuality("view"),test:async()=>{const result=await getCenterQuality({data:{year:todayJalali().y,month:Number(reconciliationMonth),refresh:true}});const active=result.centers.filter(center=>center.status==="available").length;if(!active)throw new Error("CENTER_REPORT_UNAVAILABLE");return `${active} له ${result.centers.length} مرکزونو معلومات لري.`;}},
  {key:"staff-comparison",title:"د کارکوونکو میاشتنی مطابقت",description:"د کارکوونکو راپور او د کنټرول شمېرې",permission:canReconciliation("view"),test:async()=>{const result=await getStaffReconciliation({data:{year:todayJalali().y,month:Number(reconciliationMonth)}});if(result.error)throw new Error(result.error);return result.tab?`د ${result.rows.length} ورځنیو قطارونو پرتله چمتو ده · ${result.tab}`:"د دې میاشتې ټب ونه موندل شو.";}},
  {key:"staff-daily",title:"د کارکوونکو ورځنی راپور",description:"د میاشتني کارکوونکو workbook او د ننوتلو اجازه",permission:canDashboard("view"),test:async()=>{const result=await getStaffDailyCompleteness();if(result.status==="unavailable")throw new Error(result.message);return result.status==="incomplete"?{status:"warning",message:`${result.sheet} · ${result.message}`} : `${result.sheet} · ${result.submittedCount}/${result.totalCount} راپورونه ثبت دي.`;}},
  {key:"insijam",title:"انسجام",description:"د انسجام ورځنی کارکوونکيز راپور",permission:canDashboard("view"),test:async()=>{const result=await getInsijamDailyCompleteness();if(result.status==="unavailable")throw new Error(result.message);return result.status==="incomplete"?{status:"warning",message:`${result.sheet} · ${result.message}`} : `${result.sheet} · ${result.submittedCount}/${result.totalCount} راپورونه ثبت دي.`;}},
  {key:"state-report",title:"د ریاست د پرون راپور",description:"د ریاست اصلي ټب او د تېرې ورځې کالم",permission:canDashboard("view"),test:async()=>{const result=await getStateReportForYesterday();if(result.status!=="available")throw new Error(result.message);return `${result.month} · ${result.rows.length} برخې چمتو دي.`;}},
  {key:"passed-files",title:"تېرې شوې دوسیې",description:"د کارکوونکو جلا Google Sheets او د فورمو lookup",permission:canControl("view"),test:async()=>{const date=formatJ(yesterdayJalali()).replaceAll("/","-");const result=await getPassedFiles({data:{from:date,to:date}});return result.warnings.length?{status:"warning",message:`${result.scannedTabs} ټبونه ولوستل شول؛ ${result.warnings.length} سرچینو اخطار ورکړ.`}:`${result.scannedTabs} ټبونه ولوستل شول · ${result.count} پایلې.`;}},
  {key:"problem-visitors",title:"مشلاتي مراجعین · Sheet واردول",description:"Read-only د سرلیکونو او قطارونو ازموینه؛ هېڅ database import نه کوي",permission:canProblemVisitors("view"),test:async()=>{const result=await getProblemVisitorSheetHealth();return result.skippedRows?{status:"warning",message:`سرلیک سم دی · ${result.validRows} منل شوي · ${result.skippedRows} قطارونه د validation له مخې رد دي.`}:`${result.validRows} قطارونه د import لپاره معتبر دي.`;}},
 ] as const;
 function update<K extends keyof DashboardSettings>(key:K,value:DashboardSettings[K]){saveDashboardSettings({...settings,[key]:value});setSaved(true);}
 async function refreshAll(){setBusy(true);try{await Promise.all(["sheet","diesel-sheet-report","daily-forms","daily-coordination","recent-referrals","problem-visitors","staff-report-completeness","insijam-report-completeness","state-report-yesterday","reconciliation"].map(k=>qc.invalidateQueries({queryKey:[k]})));}finally{setBusy(false);}}
 async function testReconciliation(){
  const year=todayJalali().y,month=Number(reconciliationMonth);
  setReconciliationBusy(true);setReconciliationError("");setReconciliationDiagnostic(null);
  try{
   const selectedRows={local:parseHeaderRow(headerRows.local),province:parseHeaderRow(headerRows.province)};
   const result=await readReconciliation({data:{year,month,refresh:true,headerRows:selectedRows}});
   setReconciliationDiagnostic(result);
   qc.setQueryData(["reconciliation",year,month],result);
  }catch(error){setReconciliationError(errorText(error));}
  finally{setReconciliationBusy(false);}
 }
 function saveReconciliationHeaderRows(){
  try{
   const rows={local:parseHeaderRow(headerRows.local),province:parseHeaderRow(headerRows.province)};
   const all=JSON.parse(window.localStorage.getItem(RECONCILIATION_HEADER_ROWS_KEY)||"{}");
   all[reconciliationHeaderRowKey(todayJalali().y,Number(reconciliationMonth))]=rows;
   window.localStorage.setItem(RECONCILIATION_HEADER_ROWS_KEY,JSON.stringify(all));
   setHeaderRows({local:rows.local?String(rows.local):"",province:rows.province?String(rows.province):""});
   setReconciliationDiagnostic(null);setReconciliationError("");
  }catch(error){setReconciliationError(errorText(error));}
 }
 function resetReconciliationHeaderRows(){
  try{
   const all=JSON.parse(window.localStorage.getItem(RECONCILIATION_HEADER_ROWS_KEY)||"{}");
   delete all[reconciliationHeaderRowKey(todayJalali().y,Number(reconciliationMonth))];
   window.localStorage.setItem(RECONCILIATION_HEADER_ROWS_KEY,JSON.stringify(all));
  }catch{window.localStorage.removeItem(RECONCILIATION_HEADER_ROWS_KEY);}
  setHeaderRows({local:"",province:""});setReconciliationDiagnostic(null);setReconciliationError("");
 }
 async function testReferralCell(){
   setCellBusy(true);setCellError("");setCellResult("");
   try{
    const cell=normalizeReferralCell(referralCell);
    const result=await getDailyForms({data:{cell,nonce:Date.now()}});
    if(!result.tabName)throw new Error("د نېټې شیټ ونه موندل شو");
    setCellResult((result.ah2??"—")+" · "+(result.cell??"—")+" · "+result.tabName);
   }catch(e){setCellError(String(e instanceof Error?e.message:e));}
   finally{setCellBusy(false);}
 }
 function saveReferralCell(){
   try{
    const cell=normalizeReferralCell(referralCell);
    if(cell)window.localStorage.setItem(REFERRAL_CELL_KEY,cell);
    else window.localStorage.removeItem(REFERRAL_CELL_KEY);
    setReferralCell(cell);setCellError("");setCellResult("");
    void qc.invalidateQueries({queryKey:["daily-forms"]});
   }catch(e){setCellError(String(e instanceof Error?e.message:e));}
 }
 async function testRegistrationCell(){
  setRegistrationBusy(true);setRegistrationError("");setRegistrationResult("");
  try{
   const result=await getDailyCoordination({data:{cell:normalizeReferralCell(registrationCell),nonce:Date.now()}});
   if(!result.tabName||!result.count||!/^[0-9۰-۹٠-٩٬, ]+$/.test(result.count))throw new Error("په ټاکلي سیل کې عدد ونه موندل شو");
   setRegistrationResult(result.count+" · "+(result.cell??"G3")+" · "+result.tabName);
  }catch(e){setRegistrationError(String(e instanceof Error?e.message:e));}
  finally{setRegistrationBusy(false);}
 }
 function saveRegistrationCell(){
  try{
   const cell=normalizeReferralCell(registrationCell);
   if(cell)window.localStorage.setItem(REGISTRATION_CELL_KEY,cell);
   else window.localStorage.removeItem(REGISTRATION_CELL_KEY);
   setRegistrationCell(cell);setRegistrationError("");setRegistrationResult("");
   void qc.invalidateQueries({queryKey:["daily-coordination"]});
  }catch(e){setRegistrationError(String(e instanceof Error?e.message:e));}
 }
 async function testReport(){
  setReportTestBusy(true);setReportTest("");
  try{
   setReportTest(await inspectMappedReport());
  }catch(e){setReportTest("تېروتنه: "+String(e instanceof Error?e.message:e));}
  finally{setReportTestBusy(false);}
 }
 function saveAliases(){try{window.localStorage.setItem(COLUMN_ALIAS_KEY,JSON.stringify(aliases));setAliasSaved(true);void qc.invalidateQueries({queryKey:["sheet"]});}catch{setAliasSaved(false);}}
 const flags=[{key:"showDailyVisitors",label:"ورځني مراجعین",Icon:Users},{key:"showCharts",label:"ګرافونه",Icon:BarChart3},{key:"compactCards",label:"کوچني کارتونه",Icon:PanelsTopLeft},{key:"showTodo",label:"زما دندې",Icon:ListTodo},{key:"showReportHealth",label:"د راپورونو بشپړتیا",Icon:Activity}] as const;
 return <div className="mx-auto max-w-6xl space-y-4 pb-10">
  <header className="dashboard-page-heading flex flex-wrap items-center justify-between gap-3">
   <div><div className="flex flex-wrap items-center gap-3"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Settings2 className="h-6 w-6 text-primary"/>تنظیمات</h1><RotatingTazkira className="w-14 shrink-0 sm:w-16" /></div></div>
   {saved&&<span role="status" className="inline-flex items-center gap-1 text-xs text-primary"><Check className="h-4 w-4"/>خوندي شول</span>}
  </header>
  <nav className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-2 sm:grid-cols-4" aria-label="د تنظیماتو برخې">
   {sections.map(({id,label,Icon})=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}
    className={"flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition-colors sm:text-sm "+(tab===id?"bg-primary text-primary-foreground":"hover:bg-muted text-foreground")}>
    <Icon className="h-4 w-4"/>{label}</button>)}
  </nav>
  <fieldset disabled={!can("edit")} className="min-w-0">
  {tab==="general"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">عمومي تنظیمات</h2>
   <label className="grid max-w-sm gap-2 text-sm font-semibold">اتومات تازه کول
    <select value={String(settings.refreshSeconds)} onChange={e=>update("refreshSeconds",Number(e.target.value) as DashboardSettings["refreshSeconds"])} className="h-11 rounded-xl border bg-background px-3">
     {[30,60,120,300].map(n=><option key={n} value={n}>{n<60?n+" ثانیې":(n/60)+" دقیقې"}</option>)}
    </select>
   </label>
   <Button variant="outline" disabled={busy} onClick={refreshAll}><RefreshCw className={"h-4 w-4 "+(busy?"animate-spin":"")}/>{busy?"تازه کېږي…":"ټول معلومات تازه کړئ"}</Button>
  </section>}
  {tab==="reports"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">د راپورونو ښودنه</h2>
   <div className="divide-y divide-border/60">{flags.map(({key,label,Icon})=><div key={key} className="flex items-center justify-between gap-4 py-3">
    <label htmlFor={key} className="flex items-center gap-3 text-sm font-semibold"><Icon className="h-4 w-4 text-primary"/>{label}</label>
    <Switch id={key} checked={settings[key]} onCheckedChange={v=>update(key,v)}/>
   </div>)}</div>
   <div className="border-t pt-4"><label className="grid max-w-sm gap-2 text-sm font-semibold">په جدول کې د هرې پاڼې قطارونه
    <select value={settings.tablePageSize} onChange={e=>update("tablePageSize",Number(e.target.value) as DashboardSettings["tablePageSize"])} className="h-11 rounded-xl border bg-background px-3">
     {[10,20,50,100].map(n=><option key={n} value={n}>{n} قطارونه</option>)}
    </select>
   </label></div>
  </section>}
  {tab==="sheets"&&<section className="dashboard-panel space-y-4 p-4 sm:p-6">
   <div><h2 className="font-extrabold">د Google Sheets سرچینې</h2><p className="mt-1 text-sm text-muted-foreground">هره برخه جلا وازمویئ؛ د ستونزې علت او د اصلاح اړوند تنظیمات به همدلته ښکاره شي.</p></div>
  <nav className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-4" role="group" aria-label="د Google Sheets تنظیمات">
   {([["health","سرچینې"],["daily","ورځني سیلونه"],["comparison","میاشتنی مطابقت"],["mapping","راپور او کالمونه"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={sheetView===id} onClick={()=>setSheetView(id)} className={`min-h-11 rounded-md px-2 text-xs font-semibold sm:text-sm ${sheetView===id?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
   </nav>
   {sheetView==="health"&&<div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-bold">د کاري سرچینو چټک تشخیص</h3><p className="mt-1 text-xs text-muted-foreground">یوازې د کتلو اجازه لرونکې سرچینې ازمویل کېږي؛ خام نومونه او شمېرې نه ښودل کېږي.</p></div><label className="grid gap-1 text-xs font-semibold">میاشت
     <select className="h-10 min-w-36 rounded-lg border bg-background px-3 text-sm" value={reconciliationMonth} onChange={e=>{setReconciliationMonth(e.target.value);setReconciliationDiagnostic(null);setReconciliationError("");}}>{JALALI_MONTHS.map((name,index)=><option key={index} value={index+1}>{name} {todayJalali().y}</option>)}</select>
    </label></div>
    <div className="divide-y rounded-lg border bg-background px-3">
    {sourceTests.map(source=><SourceCheckCard key={source.key} title={source.title} description={source.description} permission={source.permission} status={checkFor(source.key)} onTest={()=>void runSourceCheck(source.key,source.test)} onRepair={"repairView" in source?()=>{setSheetView(source.repairView);if("repairSheet" in source)setSheet(source.repairSheet);}:undefined}/>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="text-xs text-muted-foreground">اصلي راپورونه: {TABS.length} ټبونه · ستونزه؟ د راپور نقشې وازمویئ.</p><Button size="sm" variant="outline" onClick={()=>setSheetView("mapping")}>د راپور نقشې ته لاړ شئ</Button></div>
   </div>}
   {sheetView==="comparison"&&<div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
     <div><h2 className="text-sm font-extrabold">د مرکز او ریاست د راپورونو ازموینه</h2><p className="mt-1 text-xs text-muted-foreground">میاشت وټاکئ؛ سرچینې جلا ازمویل کېږي او د ستونزې علت دلته ښکاري.</p></div>
     <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-semibold">میاشت
      <select className="h-10 min-w-40 rounded-lg border bg-background px-3 text-sm" value={reconciliationMonth} onChange={e=>{setReconciliationMonth(e.target.value);setHeaderRows(readReconciliationHeaderRows(todayJalali().y,Number(e.target.value)));setReconciliationDiagnostic(null);setReconciliationError("");}}>
       {JALALI_MONTHS.map((name,index)=><option key={index} value={index+1}>{name} {todayJalali().y}</option>)}
      </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">زموږ راپور · د ورځو د سرلیک قطار
       <input type="number" min="1" max="2000" step="1" inputMode="numeric" className="h-10 w-40 rounded-lg border bg-background px-3 text-sm" placeholder="اتومات" value={headerRows.local} onChange={e=>{setHeaderRows(rows=>({...rows,local:e.target.value}));setReconciliationDiagnostic(null);setReconciliationError("");}}/>
      </label>
      <label className="grid gap-1 text-xs font-semibold">د ریاست راپور · د ورځو د سرلیک قطار
       <input type="number" min="1" max="2000" step="1" inputMode="numeric" className="h-10 w-40 rounded-lg border bg-background px-3 text-sm" placeholder="اتومات" value={headerRows.province} onChange={e=>{setHeaderRows(rows=>({...rows,province:e.target.value}));setReconciliationDiagnostic(null);setReconciliationError("");}}/>
      </label>
      <Button size="sm" variant="outline" onClick={saveReconciliationHeaderRows}>قطارونه خوندي کړئ</Button>
      <Button size="sm" variant="ghost" onClick={resetReconciliationHeaderRows}>اتومات ته ستانه شئ</Button>
      <Button variant="outline" disabled={reconciliationBusy} onClick={()=>void testReconciliation()}><RefreshCw className={`h-4 w-4 ${reconciliationBusy?"animate-spin":""}`}/>{reconciliationBusy?"ازموینه روانه ده…":"سرچینې وازمویئ"}</Button>
      {reconciliationDiagnostic&&<Link to="/dashboard/reconciliation" search={{year:reconciliationDiagnostic.year,month:reconciliationDiagnostic.month}} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-primary underline underline-offset-4">پرتلې ته لاړ شئ</Link>}
     </div>
     {reconciliationError&&<p role="alert" className="text-sm text-destructive">{reconciliationError}</p>}
     {reconciliationDiagnostic&&<div className="grid gap-2 sm:grid-cols-2" role="status" aria-live="polite">
      {([["زموږ راپور",reconciliationDiagnostic.local],["د ریاست راپور",reconciliationDiagnostic.province]] as const).map(([label,source])=><div key={label} className="rounded-lg border bg-background p-3">
      <p className="text-xs font-bold">{label}</p><p className={`mt-1 text-sm ${source.error||source.block!=="available"||source.ambiguous?"text-destructive":"text-primary"}`}>{reconciliationSourceText(source)}</p>
      <p className="mt-1 text-xs text-muted-foreground">بلاک: {source.block} · پېژندل شوې برخې: {source.mapped}{source.headingRow?` · سرلیک قطار: ${source.headingRow}`:""}{source.dayHeaderRow?` · د ورځو قطار: ${source.dayHeaderRow}`:""}{source.totalHeaderStatus!=="missing"?` · مجموعه: ${source.totalHeaderStatus}`:""}</p>
      </div>)}
     </div>}
    </div>}
     {sheetView==="daily"&&<>
     <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
     <h2 className="text-sm font-extrabold">نوي معرفي شوي مراجعین — د شمېر سیل</h2>
     <p className="mt-1 text-xs text-muted-foreground">اتومات پېژندنه فعاله ده؛ که سیل بدل شوی وي، دلته یې ولیکئ.</p>
     <label htmlFor="referral-count-cell" className="mt-3 grid max-w-xs gap-1 text-xs font-semibold">سیل (اختیاري)
       <input id="referral-count-cell" dir="ltr" className="h-11 rounded-xl border bg-background px-3 text-start text-sm" placeholder="اتومات — مثلاً AM2" value={referralCell} onChange={e=>{setReferralCell(e.target.value);setCellError("");setCellResult("");}}/>
     </label>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={cellBusy} onClick={()=>void testReferralCell()}>{cellBusy?"ازموینه روانه ده…":"سیل وازمویئ"}</Button>
      <Button size="sm" onClick={saveReferralCell}>خوندي کړئ</Button>
      <Button size="sm" variant="ghost" onClick={()=>{setReferralCell("");setCellError("");setCellResult("");window.localStorage.removeItem(REFERRAL_CELL_KEY);void qc.invalidateQueries({queryKey:["daily-forms"]});}}>اتومات ته ستانه شئ</Button>
     </div>
     {cellResult&&<p role="status" className="mt-2 text-sm font-semibold text-primary">لوستل شوی شمېر: {cellResult}</p>}
     {cellError&&<p role="alert" className="mt-2 text-xs text-destructive">{cellError}</p>}
   </div>
   <div className="rounded-xl border p-4">
     <h2 className="text-sm font-extrabold">ثبت‌نام ته معرفي شوي مراجعین — د شمېر سیل</h2>
     <label className="mt-3 grid max-w-xs gap-1 text-xs font-semibold">سیل (اختیاري)
      <input dir="ltr" className="h-11 rounded-xl border bg-background px-3 text-start text-sm" placeholder="اصلي G3" value={registrationCell} onChange={e=>{setRegistrationCell(e.target.value);setRegistrationError("");setRegistrationResult("");}}/>
     </label>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={registrationBusy} onClick={()=>void testRegistrationCell()}>{registrationBusy?"ازموینه روانه ده…":"سیل وازمویئ"}</Button>
      <Button size="sm" onClick={saveRegistrationCell}>خوندي کړئ</Button>
      <Button size="sm" variant="ghost" onClick={()=>{setRegistrationCell("");window.localStorage.removeItem(REGISTRATION_CELL_KEY);setRegistrationResult("");setRegistrationError("");void qc.invalidateQueries({queryKey:["daily-coordination"]});}}>اصلي G3</Button>
     </div>
     {registrationResult&&<p role="status" className="mt-2 text-sm font-bold text-primary">لوستل شوی شمېر: {registrationResult}</p>}
     {registrationError&&<p role="alert" className="mt-2 text-xs text-destructive">{registrationError}</p>}
   </div>
  </>}
  {sheetView==="mapping"&&<>
  <div className="border-t pt-4"><h2 className="font-extrabold">د راپورونو کالمونه</h2><p className="mt-1 text-xs text-muted-foreground">راپور وټاکئ، سرلیکونه وازمویئ، او که د شیټ نوم بدل شوی وي نوی نوم ثبت کړئ.</p></div>
   <label className="grid max-w-md gap-2 text-sm font-semibold">راپور
    <select className="h-11 rounded-xl border bg-background px-3" value={sheet} onChange={e=>{setSheet(e.target.value);setAliasSaved(false);setReportTest("");}}>
    {MAPPED_TABS.map(tab=><option key={tab.title} value={tab.title}>{tab.label}</option>)}
    </select>
   </label>
   <div className="grid gap-3 sm:grid-cols-2">{Object.entries(SHEET_COLUMNS[sheet]?.expectedHeaders??{}).map(([index,expected])=><label key={index} className="grid gap-1 text-xs font-semibold">{expected} <span className="text-muted-foreground">(کالم {Number(index)+1})</span>
    <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="اوسنی نوم په شیټ کې" value={aliases[sheet]?.[index]??aliases[sheet]?.[expected]??""} onChange={e=>{setAliases(prev=>({...prev,[sheet]:{...(prev[sheet]??{}),[index]:e.target.value}}));setAliasSaved(false);}}/>
   </label>)}</div>
   <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={reportTestBusy} onClick={()=>void testReport()}>{reportTestBusy?"ازموینه روانه ده…":"راپور وازمویئ"}</Button>{reportTest&&<span role="status" className="text-xs text-muted-foreground">{reportTest}</span>}</div>
   <div className="flex flex-wrap items-center gap-3"><Button onClick={saveAliases}>نومونه خوندي کړئ</Button>{aliasSaved&&<span role="status" className="text-xs text-primary">خوندي شول</span>}</div>
   <p className="text-xs text-muted-foreground">دا نومونه په همدې براوزر کې خوندي کېږي. د شیټ مهم عددي کالمونه مه حذفوئ.</p>
  </>}
  </section>}
  {tab==="account"&&<section className="dashboard-panel space-y-5 p-4 sm:p-6">
   <h2 className="font-extrabold">حساب او ساتنه</h2>
   <div className="rounded-xl bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">ننوتلی حساب</p><p dir="ltr" className="break-all text-start font-bold">{access.data?.email??"—"}</p></div>
   <div className="text-sm">د لاسرسي حالت: <strong>{access.data?.allowed?"تایید شوی":"نه دی تایید شوی"}</strong></div>
   <div className="border-t pt-4">{!resetConfirm?<Button variant="outline" onClick={()=>setResetConfirm(true)}><RotateCcw className="h-4 w-4"/>شخصي تنظیمات بېرته لومړني کړئ</Button>:
    <div className="flex flex-wrap items-center gap-2"><span className="text-sm">ټول شخصي تنظیمات بېرته وګرځي؟</span>
     <Button variant="destructive" onClick={()=>{resetDashboardSettings();setResetConfirm(false);setSaved(true);}}>تایید</Button>
     <Button variant="outline" onClick={()=>setResetConfirm(false)}>لغوه</Button>
    </div>}</div>
  </section>}
  </fieldset>
 </div>;
}
