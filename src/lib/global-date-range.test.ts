import {describe,it,expect} from "vitest";
import {normalizedRange,inGlobalRange} from "./global-date-range";
describe("global Jalali date selection",()=>{
 it("orders reversed start and end dates",()=>{
  const r=normalizedRange({y:1405,m:8,d:18},{y:1405,m:8,d:12})!;
  expect(r.from.d).toBe(12);expect(r.to.d).toBe(18);
 });
 it("includes both endpoints and excludes dates outside range",()=>{
  const r=normalizedRange({y:1405,m:8,d:12},{y:1405,m:9,d:2});
  expect(inGlobalRange({y:1405,m:8,d:12},r)).toBe(true);
  expect(inGlobalRange({y:1405,m:9,d:2},r)).toBe(true);
  expect(inGlobalRange({y:1405,m:9,d:3},r)).toBe(false);
 });
});
