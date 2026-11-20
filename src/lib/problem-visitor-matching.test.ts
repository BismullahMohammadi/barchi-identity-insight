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

it("recognizes invisible direction marks and adjacent swapped letters while keeping short names strict",()=>{
 expect(nameMatch("محمد\u200fرحیم","محمدرحیم")).toBe("exact");
 expect(nameMatch("عبدالرحمان","عبدالر محان")).toBe("similar");
 expect(nameMatch("حسن","حـنس")).toBeNull();
});

it("preserves distinct case files and the source date for historical matches",()=>{
 const person={name:"احمد",father:"علي",familyMembers:0,sourceDate:"1405/08/01",sourceTab:"sheet"};
 const visitor:ProblemVisitor={id:"v",full_name:person.name,father_name:person.father,issue:"test",created_at:"",status:"active"};
 const data={newReferrals:{date:"period",source:null,people:["1","2"].map(fileCode=>({...person,fileCode}))},
   registration:{date:null,source:null,people:[]},fetchedAt:0};
 const matches=findPotentialProblemMatches([visitor],data);
 expect(matches).toHaveLength(2);
 expect(matches[0]?.record).toMatchObject({source:"sheet",date:"1405/08/01",familyMembers:0});
 expect(findPotentialProblemMatches([{...visitor,status:"resolved"}],data)).toEqual([]);
});
