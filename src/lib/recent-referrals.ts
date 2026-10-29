import {jKey,toLatinDigits,type JDate,formatJ} from "./jalali";
import {selectDailyTab} from "./daily-forms";
export type RecentReferral={name:string;father:string;familyMembers:number|null;team?:string|undefined};
export type ReferralGroup={date:string|null;people:RecentReferral[];source:string|null};
export type RecentReferrals={newReferrals:ReferralGroup;registration:ReferralGroup;teamCounts?:[number,number,number,number];fetchedAt:number;potentialMatches?:{key:string;fullName:string;fatherName:string;section:"intake"|"registration";date:string|null}[]};

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
  current.people.push({name,father,familyMembers});
 }
 if(current)groups.push(current);
 const latest=groups.filter(g=>jKey(g.date)<=jKey(today)&&g.people.length)
   .sort((a,b)=>jKey(b.date)-jKey(a.date))[0];
 return {date:latest?formatJ(latest.date):null,people:latest?latest.people.slice(-limit).reverse():[],source:null};
}
/** The daily registration coordination tab has four independent A:C,D:F,G:I,J:L worker groups. */
export function newestRegisteredPeople(titles:string[],load:{date:JDate;grid:unknown[][]}|null,today:JDate,limit=5):ReferralGroup{
 const chosen=selectDailyTab(titles,today);
 if(!chosen||!load||jKey(load.date)!==jKey(chosen.date))
  return {date:null,people:[],source:null};
 const records:RecentReferral[]=[];
 // Header is on Excel row 5; skip section totals and metadata above it.
 for(const row of load.grid.slice(5)){
  for(const offset of [0,3,6,9]){
   const name=clean(row[offset]),father=clean(row[offset+1]),familyMembers=count(row[offset+2]);
   if(!name||!father||familyMembers===null)continue;
   records.push({name,father,familyMembers,team:({0:"درېیم ټیم",3:"څلورم ټیم",6:"پنځم ټیم",9:"شپږم ټیم"} as Record<number,string>)[offset]});
  }
 }
 return {date:formatJ(chosen.date),people:records.slice(-limit).reverse(),source:chosen.name};
}

/** Sum family-member counts for each daily registration team, not person rows. */
export function registrationTeamCounts(grid:unknown[][]):[number,number,number,number]{
 const totals:[number,number,number,number]=[0,0,0,0];
 for(const row of grid.slice(5)){
  [0,3,6,9].forEach((offset,index)=>{
   const members=count(row[offset+2]);
   if(clean(row[offset])&&clean(row[offset+1])&&members!==null)totals[index]=(totals[index]??0)+members;
  });
 }
 return totals;
}
