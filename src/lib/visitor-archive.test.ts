import { expect, it } from "vitest";
import { archivePeople } from "./visitor-archive";

it("reads each group on undated tabs and preserves missing and zero family counts", () => {
  const rows = [
    ["اسم", "ولد", "تعداد", "نام", "نام پدر", "تعداد"],
    ["الف", "ب", "۰", "ج", "د", ""],
  ];
  const people = archivePeople("پخوانی لېست", rows, { y: 1405, m: 8, d: 10 });
  expect(people.map((p) => [p.name, p.familyMembers, p.sourceTab, p.sourceDate])).toEqual([
    ["الف", 0, "پخوانی لېست", null],
    ["ج", null, "پخوانی لېست", null],
  ]);
});
it("reads earlier and later intake sections in the same tab", () => {
  const rows = [["1404/01/01"], ["1", "الف", "ب"], ["1404/01/10"], ["2", "ج", "د"]];
  expect(archivePeople("جمع آوری", rows, { y: 1405, m: 8, d: 10 }).map((p) => p.name)).toEqual([
    "الف",
    "ج",
  ]);
});
