import {describe,it,expect} from "vitest";
import {resolveMappedGrid} from "./sheet-mapping-preferences";
import {normalizeGrid} from "./normalize";

const header=["نیټه","کریمي","تابش","مجموعه سکن","علیزاده","افشار","مجموعه کنترول","نا کنترول شوي"];
const title="د آرشیف دوسیو سکن";
describe("Archive scan header mapping",()=>{
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
 it("does not guess if an expected repeated heading disappears",()=>{
  const bad=[[],[],[],header.filter((_,i)=>i!==6)];
  expect(()=>resolveMappedGrid(bad,title)).toThrow(/MISMATCH/);
 });
});