import {describe,it,expect} from "vitest";
import {extractRejectedFiles,normalizeFileCode} from "./rejection-reasons";
describe("daily rejection reasons",()=>{
 it("matches Arabic/Persian digits and whitespace in file codes",()=>{
  expect(normalizeFileCode(" ۱۲-۳۴ ")).toBe(normalizeFileCode("1234"));
 });
 it("keeps rejection reasons in their respective worker blocks",()=>{
  const grid=Array.from({length:12},()=>Array(14).fill(""));
  grid[2]![6]="دلیل رد شدن دوسیه";grid[2]![13]="دلیل رد شدن دوسیه";
  grid[7]![0]="کد دوسیه";grid[7]![7]="کد دوسیه";
  grid[8]![0]="۱۲۳";grid[8]![6]="نقص اسناد";
  grid[8]![7]="456";grid[8]![13]="";
  grid[9]![7]="۴۵۶";grid[9]![13]="معلومات نادرست";
  const result=extractRejectedFiles(grid);
  expect(result.get("123")).toBe("نقص اسناد");
  expect(result.get("456")).toBe("معلومات نادرست");
  expect(result.size).toBe(2);
 });
 it("does not mark records without rejection reason",()=>{
  const grid=[["کد دوسیه","دلیل رد شدن دوسیه"],["123",""]];
  expect(extractRejectedFiles(grid).size).toBe(0);
 });
});
