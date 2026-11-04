import {describe,it,expect} from "vitest";
import {newestCollectedPeople,newestRegisteredPeople,registrationTeamCounts} from "./recent-referrals";
const today={y:1405,m:8,d:6};
describe("recent referrals from source sheet layouts",()=>{
 it("gets only last five named people from latest nonfuture collection date",()=>{
  const grid=[
   ["تاریخ 05-08-1405"],
   ["1","Old","Father",1,1,null,"code"],["2","Old2","Father",1,1,null,"code"],
   ["تاریخ  06-08-1405"],
   ["1","First","Ali",1,2,null,"c"],["2","Second","Zaki",1,null,3,"c"],
   ["3","Third","Akbar",1,1,null,"c"],["4","Fourth","Wali",1,1,null,"c"],
   ["5","Fifth","Hadi",1,1,null,"c"],["6","Sixth","Rasul",1,null,4,"c"],
   ["تاریخ 07-08-1405"],["1","Future","Father",1,10,null,"code"],
  ];
  const people=newestCollectedPeople(grid,today);
  expect(people.date).toBe("1405/08/06");
  expect(people.people.map(p=>p.name)).toEqual(["Sixth","Fifth","Fourth","Third","Second"]);
  expect(people.people[0]?.familyMembers).toBe(4);
 });
 it("reads the latest five of four coordination sections including father and family members",()=>{
  const grid=[
   [],["date"],["total"],["teams"],
   ["اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل"],
   ["A","Fa","1","B","Fb","2","C","Fc","3","D","Fd","4"],
   ["E","Fe","5","F","Ff","6","G","Fg","7","H","Fh","8"],
  ];
  const result=newestRegisteredPeople(["6 عقرب 1405"],{date:today,grid},today);
  expect(result.people.map(p=>p.name)).toEqual(["H","G","F","E","D"]);
  expect(result.people[0]?.father).toBe("Fh");
  expect(result.people[0]?.familyMembers).toBe(8);
 });
 it("does not return yesterday's registration records when today is absent",()=>{
  const grid=[[],[],[],[],[],["Yesterday","Father","3"]];
  const result=newestRegisteredPeople(["5 عقرب 1405"],{date:{y:1405,m:8,d:5},grid},today);
  expect(result).toMatchObject({date:null,people:[],source:null});
  expect(result.diagnostic.status).toBe("no_today_tab");
  expect(result.diagnostic.latestTab).toBe("5 عقرب 1405");
 });
 it("never accidentally shows a future or mismatched sheet as today",()=>{
  expect(newestRegisteredPeople(["7 عقرب 1405"],{date:today,grid:[]},today).people).toEqual([]);
  expect(newestCollectedPeople([["تاریخ 07-08-1405"],["1","Future","Father",1,1]],today).people).toEqual([]);
 });
});

// Real coordination layout on 1405/08/13 (names replaced by placeholders): row 2 in-sheet date,
// row 3 total, row 4 team totals, row 5 headers, people from row 6; father often blank.
const realToday={y:1405,m:8,d:13};
const realTitles=["نمونه جدول هماهنگی 1405","13 عفرب 1405","12 عقرب 1405","11 عقرب 1405","Sheet2"];
const realGrid=[
 [],["1405/07/13"],["مجموع انفرادی هماهنگی شده","","","","","","31"],
 ["T3","","9","T4","","7","T5","","8","T6","","7"],
 ["اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل","اسم","ولد","تعداد اعضای فامیل"],
 ["P1","F1","1","P2","F2","1","P3","","1","P4","F4","1"],
 ["P5","","1","P6","","1","P7","F7","1","P8","F8","3"],
 ["P9","F9","3","","","","P10","","2"],
];
describe("registration coordination: real tab naming and layout",()=>{
 it("finds today's tab even when spelled «عفرب» and reads people with blank father",()=>{
  const result=newestRegisteredPeople(realTitles,{date:realToday,grid:realGrid},realToday,50);
  expect(result.source).toBe("13 عفرب 1405");
  expect(result.date).toBe("1405/08/13");
  expect(result.diagnostic.status).toBe("ok");
  expect(result.diagnostic.headerRow).toBe(5);
  expect(result.diagnostic.groups).toBe(4);
  expect(result.people).toHaveLength(10);
  expect(result.people.find(p=>p.name==="P3")?.father).toBe("—");
  expect(result.people[0]?.name).toBe("P10");
  expect(result.people[0]?.team).toBe("پنځم ټیم");
 });
 it("sums team family members from the detected layout",()=>{
  expect(registrationTeamCounts(realGrid)).toEqual([5,2,4,4]);
 });
 it("reports an existing but empty today tab separately",()=>{
  const result=newestRegisteredPeople(realTitles,{date:realToday,grid:realGrid.slice(0,5)},realToday);
  expect(result.diagnostic.status).toBe("empty_today");
  expect(result.people).toEqual([]);
 });
 it("reports a today tab without the expected header",()=>{
  const result=newestRegisteredPeople(realTitles,{date:realToday,grid:[["something"],["else"]]},realToday);
  expect(result.diagnostic.status).toBe("no_header");
 });
 it("never shows yesterday (12 عقرب) as today on 14 عقرب",()=>{
  const result=newestRegisteredPeople(["12 عقرب 1405","13 عفرب 1405"],null,{y:1405,m:8,d:14});
  expect(result.people).toEqual([]);
  expect(result.diagnostic.status).toBe("no_today_tab");
  expect(result.diagnostic.latestTab).toBe("13 عفرب 1405");
 });
 it("detects headers that shifted to another row",()=>{
  const shifted=[[],...realGrid];
  const result=newestRegisteredPeople(realTitles,{date:realToday,grid:shifted},realToday,50);
  expect(result.diagnostic.headerRow).toBe(6);
  expect(result.people).toHaveLength(10);
 });
});
