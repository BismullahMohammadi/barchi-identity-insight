import {describe,it,expect} from "vitest";
import {birthCardConfirmations} from "./birth-card-confirmations";
describe("birth-card confirmation from daily sheet",()=>{
 it("finds positive numbers in every worker block",()=>{
  const grid=Array.from({length:11},()=>Array(14).fill(""));
  grid[7]![0]="کد دوسیه";grid[7]![4]="مطابق کارت تولد";
  grid[7]![7]="کد دوسیه";grid[7]![11]="مطابق کارت تولد";
  grid[8]![0]="۱۲۳";grid[8]![4]="2";
  grid[8]![7]="456";grid[8]![11]="0";
  grid[9]![7]="۴۵۷";grid[9]![11]="۳";
  const confirmed=birthCardConfirmations(grid);
  expect(confirmed.get("123")).toBe(2);
  expect(confirmed.has("456")).toBe(false);
  expect(confirmed.get("457")).toBe(3);
 });
});
