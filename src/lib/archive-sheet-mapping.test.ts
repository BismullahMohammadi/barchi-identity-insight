import {describe,it,expect,vi,afterEach} from "vitest";
import {resolveMappedGrid} from "./sheet-mapping-preferences";
import {normalizeGrid} from "./normalize";
import {resolveTabTitle} from "./tabs";

const header=["نیټه","کریمي","تابش","مجموعه سکن","علیزاده","افشار","مجموعه کنترول","نا کنترول شوي"];
const title="د آرشیف دوسیو سکن";
describe("Archive scan header mapping",()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it("resolves the archive tab from either known workbook title",()=>{
  expect(resolveTabTitle("archive-scan",["د آرشیف دوسیو سکن"])).toBe("د آرشیف دوسیو سکن");
  expect(resolveTabTitle("archive-scan",["د آرشیف او سکن"])).toBe("د آرشیف او سکن");
  expect(resolveTabTitle("archive-scan",["نامعلوم ټاب"])).toBeNull();
 });
 it("uses the live official archive headings even if a stale browser alias is saved",()=>{
  vi.stubGlobal("window",{localStorage:{getItem:()=>JSON.stringify({"د آرشیف دوسیو سکن":{"3":"مجموعه","6":"مجموعه"}})}});
  const sheet=[[],[],[],header,["۱۴۰۵/۰۸/۰۴","787","1015","1802","730","954","1684","118"]];
  const table=normalizeGrid(resolveMappedGrid(sheet,title),title);
  expect(table.rows.length).toBe(1);
  expect(table.rows[0]?.[3]).toBe(1802);
  expect(table.rows[0]?.[6]).toBe(1684);
 });
 it("keeps both total columns as distinct measurements",()=>{
  const input=[["د آرشیف سکن شوي دوسیې او کنترول"],[],["","سکن شوي ورقې","","","کنترول شوي ورقې"],header,["۱۴۰۵/۰۱/۰۱","2","3","5","1","2","3","2"]];
  const mapped=resolveMappedGrid(input,title);
  const table=normalizeGrid(mapped,title);
  expect(table.rows).toHaveLength(1);
  expect(table.rows[0]?.[3]).toBe(5);
  expect(table.rows[0]?.[6]).toBe(3);
  expect(table.rows[0]?.[7]).toBe(2);
 });
 it("follows both repeated total headings when two new columns are inserted",()=>{
  const changed=[header[0],"new",...header.slice(1,6),"extra",...header.slice(6)];
  const input:string[][]=[[],[],[],changed as string[],["۱۴۰۵/۰۱/۰۱","", "2","3","5","1","2","","3","2"]];
  const table=normalizeGrid(resolveMappedGrid(input,title),title);
  expect(table.rows[0]?.[3]).toBe(5);
  expect(table.rows[0]?.[6]).toBe(3);
 });
 it("uses the source tab title when archive columns move",()=>{
  const sourceTitle="د آرشیف او سکن";
  const changed=[header[0],"new",...header.slice(1,6),"extra",...header.slice(6)];
  const input:string[][]=[[],[],[],changed as string[],["۱۴۰۵/۰۱/۰۱","", "2","3","5","1","2","","3","2"]];
  const table=normalizeGrid(resolveMappedGrid(input,sourceTitle),sourceTitle);
  expect(table.rows[0]?.[3]).toBe(5);
  expect(table.rows[0]?.[6]).toBe(3);
 });
 it("does not guess if an expected repeated heading disappears",()=>{
  const bad=[[],[],[],header.filter((_,i)=>i!==6)];
  expect(()=>resolveMappedGrid(bad,title)).toThrow(/MISMATCH/);
 });
});