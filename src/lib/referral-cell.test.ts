import {describe,it,expect} from "vitest";
import {findReferralTotal,normalizeReferralCell} from "./referral-cell";
describe("daily referral count cell mapping",()=>{
 it("finds shifted AM2 count from source label",()=>{
  const row=Array.from({length:39},()=>"");
  row[32]="مجموع فورم های معرفی شده در هر روز ";row[38]="13";
  expect(findReferralTotal([[],row])?.cell).toBe("AM2");
  expect(findReferralTotal([[],row])?.value).toBe("13");
 });
 it("supports manually selected valid cell",()=>{
  const row=Array.from({length:39},()=>"");row[38]="۱۳";
  expect(findReferralTotal([[],row],"am2")?.value).toBe("۱۳");
 });
 it("rejects invalid and text-only manual coordinates",()=>{
  expect(()=>normalizeReferralCell("https://example.com")).toThrow();
  expect(findReferralTotal([["text"]],"A1")).toBeNull();
 });
});