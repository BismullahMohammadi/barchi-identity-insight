import { describe, expect, it } from "vitest";
import { getSummaryMetrics, getTransferCount } from "./summary-metrics";

describe("dashboard summary cards", () => {
  it("uses source خدمات columns B,C,D,E and G without double counting", () => {
    const grid = [
      ["خدمات"],
      [],
      [],
      ["نیټه","مثنی","تجدید","ثبت تولد","ثبت ازدواج","مجموعه","عواید (مثنی، تجدید)"],
      ["۱۴۰۵/۰۱/۰۳","5","10","2","0","17","AFN 15,000"],
      ["۱۴۰۵/۰۱/۰۴","7","7","2","0","16","AFN 14,000"]
    ];
    expect(getSummaryMetrics(grid)).toEqual({
      duplicate: 12, renewal: 17, births: 4, marriages: 0, serviceRevenue: 29000
    });
  });
  it("reads incoming tazkiras from arrivals column C", () => {
    const grid = [
      ["مرکز ته را رسیدلي تذکرې"],
      [],
      [],
      ["نیټه","ورځ","تذکرو تعداد","ناقصې تذکرې","انتقالونکی","تسلیمي اخیستونکی"],
      ["۱۴۰۵/۰۱/۰۵","چهار شنبه","369"]
    ];
    expect(getTransferCount(grid)).toBe(369);
  });
});
