import {describe,it,expect} from "vitest";
import {dailyApprovalDetails,birthCardConfirmations} from "./birth-card-confirmations";
describe("three-column daily approval",()=>{
 const grid=Array.from({length:12},()=>Array(14).fill(""));
 grid[7]![0]="کد دوسیه";grid[7]![3]="مطابق تذکره کاغذی";grid[7]![4]="مطابق کارت تولد";grid[7]![5]="تعین سن و ضمانت";
 grid[7]![7]="کد دوسیه";grid[7]![10]="مطابق تذکره کاغدی";grid[7]![11]="مطابق کارت تولد";grid[7]![12]="تعین سن و ضمانت";
 grid[8]![0]="123";grid[8]![3]="۲";
 grid[9]![0]="456";grid[9]![5]="1";
 grid[10]![7]="18705";grid[10]![11]="1";
 grid[11]![7]="888";grid[11]![10]="0";
 it("approves paper, birth and age columns across workers",()=>{
  const approved=dailyApprovalDetails(grid);
  expect(approved.get("123")?.paperCount).toBe(2);
  expect(approved.get("456")?.ageCount).toBe(1);
  expect(approved.get("18705")?.birthCount).toBe(1);
  expect(approved.has("888")).toBe(false);
 });
 it("only birth-card approvals enter birth registration",()=>{
  const birth=birthCardConfirmations(grid);
  expect([...birth.keys()]).toEqual(["18705"]);
 });
});
