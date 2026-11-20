import {jKey,toLatinDigits,type JDate,formatJ} from "./jalali";
import {selectTodayCoordinationTab} from "./daily-forms";
export type RecentReferral={name:string;father:string;familyMembers:number|null;fileCode?:string|undefined;rejectionReason?:string|undefined;birthCardConfirmed?:boolean|undefined;dailyApproved?:boolean|undefined;team?:string|undefined;recordKey?:string|undefined};
export type ReferralGroup={date:string|null;people:RecentReferral[];source:string|null;diagnostic?:RegistrationDiagnostic|undefined;requestedDate?:string|undefined};
export type RecentReferrals={newReferrals:ReferralGroup;registration:ReferralGroup;teamCounts?:[number,number,number,number];fetchedAt:number;birthCardAddedCount?:number;matchHistorySaved?:boolean;potentialMatches?:{key:string;visitorId?:string;fullName:string;fatherName:string;section:"intake"|"registration";date:string|null}[]};

function clean(x:unknown):string{return String(x??"").replace(/\s+/g," ").trim();}
function count(x:unknown):number|null{
 const n=toLatinDigits(clean(x)).replace(/[٬,]/g,"");
 if(!/^\d+$/.test(n))return null;
 const number=Number(n);
 return Number.isSafeInteger(number)&&number>=0&&number<=500?number:null;
}
function parseSectionDate(raw:unknown):JDate|null{
 const s=toLatinDigits(clean(raw));
 // Daily collection workbook uses either "تاریخ 06-08-1405" or "1405-08-05".
 const a=s.match(/(?:تاریخ\s*)?(\d{1,2})[-/.](\d{1,2})[-/.](14\d\d)/);
 const b=s.match(/(14\d\d)[-/.](\d{1,2})[-/.](\d{1,2})/);
 const date=a?{d:+a[1]!,m:+a[2]!,y:+a[3]!}:b?{y:+b[1]!,m:+b[2]!,d:+b[3]!}:null;
 if(!date||date.m<1||date.m>12||date.d<1||date.d>(date.m<=6?31:30))return null;
 return date;
}
/** Read the most recent nonfuture dated collection section, not arbitrary last worksheet rows. */
export function newestCollectedPeople(grid:unknown[][],today:JDate,limit=5):ReferralGroup{
 const groups:{date:JDate;people:RecentReferral[]}[]=[];
 let current:{date:JDate;people:RecentReferral[]}|null=null;
 for(const row of grid){
  const day=parseSectionDate(row[0]);
  if(day){
   if(current)groups.push(current);
   current={date:day,people:[]};
   continue;
  }
  if(!current||jKey(current.date)>jKey(today))continue;
  // A: serial, B: full name, C: father, E/F: two collectors' family counts.
  const serial=count(row[0]),name=clean(row[1]),father=clean(row[2]);
  if(serial===null||serial<1||!name||!father)continue;
  const left=count(row[4]),right=count(row[5]);
  const familyMembers=left!==null&&right!==null?left+right:left??right;
  current.people.push({name,father,familyMembers,fileCode:clean(row[6]),recordKey:`${formatJ(current.date)}:${serial}:${clean(row[6])}`});
 }
 if(current)groups.push(current);
 const latest=groups.filter(g=>jKey(g.date)<=jKey(today)&&g.people.length)
   .sort((a,b)=>jKey(b.date)-jKey(a.date))[0];
 return {date:latest?formatJ(latest.date):null,people:latest?latest.people.slice(-limit).reverse():[],source:null,requestedDate:formatJ(today)};
}
/** Scan every dated section of the monthly intake tab. Birth-card approvals may
 * arrive on a later day than the original intake, so latest-day-only is insufficient. */
export function collectedPeopleThroughDate(grid:unknown[][],today:JDate):RecentReferral[]{
 const people:RecentReferral[]=[];
 let date:JDate|null=null;
 for(const row of grid){
  const section=parseSectionDate(row[0]);
  if(section){date=section;continue;}
  if(!date||jKey(date)>jKey(today))continue;
  const serial=count(row[0]),name=clean(row[1]),father=clean(row[2]);
  if(serial===null||serial<1||!name||!father)continue;
  const left=count(row[4]),right=count(row[5]);
  people.push({name,father,familyMembers:left!==null&&right!==null?left+right:left??right,fileCode:clean(row[6]),recordKey:`${formatJ(date)}:${serial}:${clean(row[6])}`});
 }
 return people;
}
export type RegistrationStatus="ok"|"no_today_tab"|"empty_today"|"no_header"|"fetch_error";
/** Safe metadata only: dates, tab titles (which are dates), counts — never person data. */
export type RegistrationDiagnostic={status:RegistrationStatus;today:string;todayTab:string|null;latestTab:string|null;latestDate:string|null;headerRow:number|null;groups:number;rowsScanned:number;sheetDateCell:string|null;errorCode?:string|undefined};
const TEAM_LABELS=["درېیم ټیم","څلورم ټیم","پنځم ټیم","شپږم ټیم"];
/** Find the header row (اسم / ولد / تعداد) and each worker group's starting column. */
export function detectRegistrationLayout(grid:unknown[][]):{headerIndex:number;offsets:number[]}|null{
 for(let r=0;r<Math.min(grid.length,25);r++){
  const row=grid[r]??[];
  const offsets:number[]=[];
  for(let c=0;c<row.length;c++){
   const here=clean(row[c]);
   if(/^(اسم|نام)$/.test(here)&&/تعداد|اعضا|فامیل/.test(clean(row[c+2])))offsets.push(c);
  }
  if(offsets.length)return {headerIndex:r,offsets};
 }
 return null;
}
function readRegistrationRows(grid:unknown[][]):{records:RecentReferral[];layout:ReturnType<typeof detectRegistrationLayout>}{
 const layout=detectRegistrationLayout(grid);
 if(!layout)return {records:[],layout};
 const records:RecentReferral[]=[];
 for(const row of grid.slice(layout.headerIndex+1)){
  layout.offsets.forEach((offset,index)=>{
   const name=clean(row[offset]);
   if(!name||/^(مجموع|ټول|جمع)/.test(name))return;
   const father=clean(row[offset+1]),familyMembers=count(row[offset+2]);
   // Real sheets often leave the father column blank; keep the person, show "—".
   if(!father&&familyMembers===null)return;
   records.push({name,father:father||"—",familyMembers,team:TEAM_LABELS[index]??`ټیم ${index+1}`});
  });
 }
 return {records,layout};
}
/** The daily registration coordination tab has independent worker groups (normally A:C,D:F,G:I,J:L). */
export function newestRegisteredPeople(titles:string[],load:{date:JDate;grid:unknown[][]}|null,today:JDate,limit=5):ReferralGroup&{diagnostic:RegistrationDiagnostic}{
 const pick=selectTodayCoordinationTab(titles,today);
 const chosen=pick.today;
 const base:RegistrationDiagnostic={status:"no_today_tab",today:formatJ(today),todayTab:chosen?.name??null,
  latestTab:pick.latest?.name??null,latestDate:pick.latest?formatJ(pick.latest.date):null,headerRow:null,groups:0,rowsScanned:0,sheetDateCell:null};
 if(!chosen||!load||jKey(load.date)!==jKey(chosen.date))
  return {date:null,people:[],source:null,diagnostic:base};
 const {records,layout}=readRegistrationRows(load.grid);
 const dateCell=load.grid.slice(0,4).flat().map(clean).find(v=>/14\d\d[/\-.]\d{1,2}[/\-.]\d{1,2}/.test(toLatinDigits(v)))??null;
 const diagnostic:RegistrationDiagnostic={...base,status:!layout?"no_header":records.length?"ok":"empty_today",
  headerRow:layout?layout.headerIndex+1:null,groups:layout?.offsets.length??0,
  rowsScanned:layout?Math.max(0,load.grid.length-layout.headerIndex-1):0,sheetDateCell:dateCell?toLatinDigits(dateCell):null};
 return {date:formatJ(chosen.date),people:records.slice(-limit).reverse(),source:chosen.name,diagnostic};
}

/** Sum family-member counts for each daily registration team, not person rows. */
export function registrationTeamCounts(grid:unknown[][]):[number,number,number,number]{
 const totals:[number,number,number,number]=[0,0,0,0];
 for(const person of readRegistrationRows(grid).records){
  const index=TEAM_LABELS.indexOf(person.team??"");
  if(index>=0&&index<4&&person.familyMembers!==null)totals[index]=(totals[index]??0)+person.familyMembers;
 }
 return totals;
}

/** Collect records across all dated sections in a selected inclusive period. */
export function collectedPeopleInRange(grid:unknown[][],from:JDate,to:JDate):RecentReferral[]{
 const all=collectedPeopleThroughDate(grid,to);
 return all.filter(p=>{
  const raw=p.recordKey?.split(":")[0]??"";
  const match=raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if(!match)return false;
  const key=Number(match[1])*10000+Number(match[2])*100+Number(match[3]);
  return key>=jKey(from)&&key<=jKey(to);
 });
}
