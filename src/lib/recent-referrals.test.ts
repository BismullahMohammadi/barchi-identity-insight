import {describe,it,expect} from "vitest";
import {newestCollectedPeople,newestRegisteredPeople} from "./recent-referrals";
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
  expect(newestRegisteredPeople(["5 عقرب 1405"],{date:{y:1405,m:8,d:5},grid},today)).toEqual({date:null,people:[],source:null});
 });
 it("never accidentally shows a future or mismatched sheet as today",()=>{
  expect(newestRegisteredPeople(["7 عقرب 1405"],{date:today,grid:[]},today).people).toEqual([]);
  expect(newestCollectedPeople([["تاریخ 07-08-1405"],["1","Future","Father",1,1]],today).people).toEqual([]);
 });
});
