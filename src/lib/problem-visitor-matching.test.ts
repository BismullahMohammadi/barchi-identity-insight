import { describe, expect, it } from "vitest";
import { nameMatch, normalizedPerson, findPotentialProblemMatches } from "./problem-visitor-matching";
import type { ProblemVisitor } from "./problem-visitors.functions";
import type { RecentReferrals } from "./recent-referrals";

describe("problem visitor fuzzy matching",()=>{
 it("ignores whitespace and common Pashto/Dari letter variants",()=>{
  expect(normalizedPerson("محمد  رحيم")).toBe(normalizedPerson("محمدرحیم"));
  expect(nameMatch("احمد  رحماني","احمدرحمانی")).toBe("exact");
 });
 it("flags small spelling differences conservatively",()=>{
  expect(nameMatch("عبدالرحمان","عبدالرحمن")).toBe("similar");
  expect(nameMatch("احمد","خالد")).toBeNull();
  expect(nameMatch("علي","عمر")).toBeNull();
 });
 it("requires both visitor and father names",()=>{
  const watch=[{id:"1",full_name:"احمد رحماني",father_name:"محمد رحيم",issue:"دوسیه",status:"active",created_at:"2026-10-28"}] as ProblemVisitor[];
  const data={newReferrals:{date:"1405/08/06",source:null,people:[{name:"احمدرحمانی",father:"محمد رحیم",familyMembers:3},{name:"احمدرحمانی",father:"عبدالله",familyMembers:3}]},registration:{date:null,source:null,people:[]},fetchedAt:1} as RecentReferrals;
  const found=findPotentialProblemMatches(watch,data);
  expect(found).toHaveLength(1);
  expect(found[0]?.confidence).toBe("normalized-exact");
 });
});
