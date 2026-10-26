import { describe, expect, it } from "vitest";
import { normalizeGrid, parseNumber, sumColumn } from "./normalize";
import { SHEET_COLUMNS } from "./sheet-columns";

function sheet(title: string, head: string[], rows: string[][]) {
  const h = SHEET_COLUMNS[title];
  if (!h) throw new Error("Unknown");
  return [...Array.from({length:h.headerRow},()=>[]),head,...rows];
}
describe("verified eNID tab mapping",()=>{
  it("parses AFN and Afghan currency correctly",()=>{
    expect(parseNumber("AFN 32,000")).toBe(32000);
    expect(parseNumber("؋ 31,000")).toBe(31000);
    expect(parseNumber("AFN211,500")).toBe(211500);
  });
  it("maps total report to passed cases, not tariffs",()=>{
    const g=sheet("مجموعی راپور",["نېټه","تعرفې","عواید","پاس شوي","اضافي عواید (بانکی)","توزیع","انتقال شوي عواید","خدمات (عواید)"],[
      ["۱۴۰۵/۰۱/۰۳","64","AFN 32,000","65","-500","71","AFN 0","AFN 15,000"],
      ["۱۴۰۵/۰۱/۰۴","115","AFN 57,500","118","-1500","25","AFN 0","AFN 14,000"]
    ]);
    const n=normalizeGrid(g,"مجموعی راپور");
    expect(n.headers[3]).toBe("پاس شوي");
    expect(sumColumn(n.rows,3)).toBe(183);
    expect(sumColumn(n.rows,2)).toBe(89500);
    expect(n.dates[0]).toEqual({y:1405,m:1,d:3});
  });
  it("maps identity paper-document and age determination categories without empty worker columns",()=>{
    const g=sheet("تثبت هویت",["نېټه","سید نثار","ګل واری","","خلیل","ایوب زاده","شغله","صدیقه","کاغذي تذکرې مطابق","تعین سن","جمله"],[
      ["۱۴۰۵/۰۱/۰۳","","","","","","","","75","8","83"]]);
    const n=normalizeGrid(g,"تثبت هویت");
    expect(n.numericCols).toContain(10);
    expect(n.numericCols).toContain(9);
    expect(n.numericCols).not.toContain(2);
    expect(sumColumn(n.rows,8)).toBe(75);
    expect(sumColumn(n.rows,9)).toBe(8);
    expect(sumColumn(n.rows,10)).toBe(83);
  });
  it("does not add bank subtotals to bank grand total",()=>{
    const g=sheet("بانکي عواید",["نېټه","جدید او ثبت تولد","مثنی","تجدید","مثنی او تجدید","انفرادی تعداد","مجموعه"],[
      ["۱۴۰۵/۰۱/۰۳","32000","15000","0","15000","64","47000"]]);
    const n=normalizeGrid(g,"بانکي عواید");
    expect(sumColumn(n.rows,6)).toBe(47000);
  });
  it("recognizes the year report as month-indexed, not daily date-indexed",()=>{
    const g=sheet("کالنی ګزارش",["ربعه","میاشت","تثبیت هویت","جــــــــــــــدید","جدید او ثبت تولد","مثنی","تجدید","ثبت تولد","ثبت ازدواج","جدید، تولد، مثنی او تجدید","مثنی او تجدید","توزیع","جمع آوري شوي عواید","عواید مثنی و تجدید","مجموعي عواید"],[
      ["اوله","حمل","4459","3646","3767","218","168","121","28","4153","386","1338","AFN 1,881,500","AFN 388,000","AFN 2,269,500"],
      ["","مجموعه","4459","","","","","","","","","","","",""]]);
    const n=normalizeGrid(g,"کالنی ګزارش");
    expect(n.rows.length).toBe(1);
    expect(sumColumn(n.rows,14)).toBe(2269500);
  });
  it("transposes directorate report without summing daily figures twice",()=>{
    const header=["بخشونه (میزان ۷)",...Array.from({length:30},(_,i)=>String(i+1)),"","جمله"];
    const n=normalizeGrid([header,["چک اسناد","96","72",...Array.from({length:29},()=>""),"2519"]],"ریاست ته ګزارش");
    expect(n.headers).toEqual(["بخشونه","مجموعه"]);
    expect(n.rows[0]?.[1]).toBe(2519);
  });
  it("fails clearly when source header meanings change",()=>{
    const bad=sheet("توزیع",["نیټه","الف","ب","غلط"],[["۱۴۰۵/۰۱/۰۳","35","36","71"]]);
    expect(()=>normalizeGrid(bad,"توزیع")).toThrow("SHEET_MAPPING_MISMATCH");
  });
});