import { describe, expect, it } from "vitest";
import { latestActivitySignal } from "./management-insight";
import type { NormalizedTable } from "./normalize";

function table(values: [number, number][]): NormalizedTable {
  return {
    headers: ["نېټه", "پاس شوي"],
    rows: values.map(([day,count])=>[`1405/07/${day}`,count]),
    dates: values.map(([day])=>({y:1405,m:7,d:day})),
    dateCol: 0, numericCols:[1], labelCol:0,
  };
}
describe("conservative management insights",()=>{
  it("highlights declines between two recorded days",()=>{
    const result=latestActivitySignal(table([[28,100],[29,70]]),1);
    expect(result?.lastDate).toBe("1405/07/29");
    expect(result?.lastCount).toBe(70);
    expect(result?.changePercent).toBe(-30);
    expect(result?.message).toMatch(/کم شوی/);
  });
  it("does not fabricate comparisons when there is only one report",()=>{
    expect(latestActivitySignal(table([[29,70]]),1)?.message).toBeNull();
  });
  it("does not divide by zero or invent growth",()=>{
    expect(latestActivitySignal(table([[28,0],[29,70]]),1)?.changePercent).toBeNull();
  });
});
