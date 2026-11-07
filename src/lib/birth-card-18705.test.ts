import {describe,it,expect} from "vitest";
import {birthCardConfirmations} from "./birth-card-confirmations";
import {collectedPeopleThroughDate} from "./recent-referrals";
import {normalizeFileCode} from "./rejection-reasons";
describe("file 18705 birth registration on 16 Aqrab",()=>{
 it("matches monthly intake with the second worker's birth-card column",()=>{
  const daily=Array.from({length:10},()=>Array(42).fill(""));
  for(let i=0;i<6;i++){daily[7]![i*7]="کد دوسیه";daily[7]![i*7+4]="مطابق کارت تولد";}
  daily[9]![7]="18705";daily[9]![11]="1";
  const monthly=[["1405-08-16"],[8,"نیکبخت","باز محمد",1,null,1,"18705"]];
  const people=collectedPeopleThroughDate(monthly,{y:1405,m:8,d:16});
  const confirmed=birthCardConfirmations(daily);
  expect(people).toHaveLength(1);
  expect(confirmed.get(normalizeFileCode(people[0]!.fileCode))).toBe(1);
 });
});
