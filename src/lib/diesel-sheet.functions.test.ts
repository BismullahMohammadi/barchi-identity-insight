import { describe, expect, it } from "vitest";
import { parseDieselReconciliation, parseDieselSheet } from "./diesel-sheet.functions";

describe("diesel sheet calculations", () => {
  it("calculates monthly consumption from localized hours and rate", () => {
    const records = parseDieselSheet([
      [], [], [], [],
      ["1405--01", "1405/01/01", "1405/01/31", "حمل", "۱۰٫۵", "۳٫۲", "۳۳٫۶", "", "0"],
    ]);

    expect(records[0]).toMatchObject({
      hours: 10.5,
      litersPerHour: 3.2,
      consumedLiters: 33.6,
      calculatedLiters: 33.6,
      consumptionDifference: 0,
    });
  });

  it("keeps the sheet value and reports a mismatch instead of silently replacing it", () => {
    const records = parseDieselSheet([
      [], [], [], [],
      ["1405--01", "", "", "حمل", 10, 3.5, 36, "", 0],
    ]);

    expect(records[0]?.consumedLiters).toBe(36);
    expect(records[0]?.calculatedLiters).toBe(35);
    expect(records[0]?.consumptionDifference).toBe(1);
  });

  it("does not treat prefilled zeroes without inputs as verified consumption", () => {
    const records = parseDieselSheet([
      [], [], [], [],
      ["1405--01", "", "", "حمل", "", "", 0, "", ""],
    ]);

    expect(records[0]).toMatchObject({
      consumedLiters: null,
      calculatedLiters: null,
      consumptionDifference: null,
    });
  });

  it("parses signed localized reconciliation values", () => {
    const reconciliation = parseDieselReconciliation([
      ["", "مجموعه", "", "", 8, "", 250],
      ["", "جمله", "", 500],
      ["", "په اداره باندې پاتې", "", "", "-۲٫۵"],
      ["موجودي ترسره شوه ۱۴۰۵/۰۶/۳۱ — ۲۵۰٫۵ لیتره"],
    ]);

    expect(reconciliation.sheetDifference).toBe(-2.5);
    expect(reconciliation.physicalStock).toBe(250.5);
    expect(reconciliation.physicalStockDate).toBe("1405/06/31");
  });
});
