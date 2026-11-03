import {describe,expect,it} from "vitest";
import {filterByDate,normalizeGrid,sumColumn} from "./normalize";
const source=[
 ["د آرشیف سکن شوي دوسیې او کنترول"],[],
 ["","سکن شوي ورقې","","","کنترول شوي ورقې"],
 ["نیټه","کریمي","تابش","مجموعه سکن","علیزاده","افشار","مجموعه کنترول","نا کنترول شوي"],
 ["۱۴۰۵/۰۱/۰۱","","","0","","","0","0"],
 ["۱۴۰۵/۰۱/۰۲","16","24","40","18","10","28","12"],
 ["۱۴۰۵/۰۲/۰۱","5","10","15","8","7","15","0"],
];
describe("verified archive scan tab",()=>{
 it("uses two different sum columns, and does not double-count employee totals",()=>{
  const t=normalizeGrid(source,"د آرشیف دوسیو سکن");
  expect(t.headers[3]).toBe("مجموعه سکن");
  expect(t.headers[6]).toBe("مجموعه کنترول");
  expect(sumColumn(t.rows,3)).toBe(55);
  expect(sumColumn(t.rows,6)).toBe(43);
  expect(sumColumn(t.rows,7)).toBe(12);
  expect(sumColumn(t.rows,1)).toBe(21);
  expect(sumColumn(t.rows,2)).toBe(34);
 });
 it("filters rows by Afghan Jalali month correctly",()=>{
  const t=normalizeGrid(source,"د آرشیف دوسیو سکن");
  const firstMonth=filterByDate(t,{from:{y:1405,m:1,d:1},to:{y:1405,m:1,d:31}}).rows;
  expect(sumColumn(firstMonth,3)).toBe(40);
  expect(sumColumn(firstMonth,7)).toBe(12);
 });
 it("refuses columns if the spreadsheet headings change",()=>{
  const changed=source.map(row=>[...row]);
  changed[3]![7]="مختلف";
  expect(()=>normalizeGrid(changed,"د آرشیف دوسیو سکن")).toThrow("SHEET_MAPPING_MISMATCH");
 });
});
