import {expect,it} from "vitest";
import {parseProblemVisitorSheet} from "./problem-visitor-sheet";
import {findPotentialProblemMatches} from "./problem-visitor-matching";

it("maps the named columns, skips partial rows and keeps keys stable on reordering",()=>{
 const header=["شماره ","تاریخ","اسم","ولد ","ولدیت","شرح مشکل مراجع کننده","اسم کارمند","ملاحظات"];
 const row=["1","","نوم الف","پلار ب","نیکه ج","ازمایښتي ستونزه"];
 const parsed=parseProblemVisitorSheet([["عنوان"],header,row,["2","","نیمګړی"]]);
 expect(parsed.skipped).toBe(1);
 const entry=parsed.entries[0]!;
 expect(entry.father_name).toBe("پلار ب");
 expect(parseProblemVisitorSheet([header,[],["3",...row.slice(1)]]).entries[0]?.source_key).toBe(entry.source_key);
 expect(()=>parseProblemVisitorSheet([["اسم","ولدیت"]])).toThrow("VISITOR_SHEET_HEADER");
 const group={date:"1405/08/28",source:null,people:[{name:row[2]!,father:row[3]!,familyMembers:1}]};
 expect(findPotentialProblemMatches([{...entry,id:"test",created_at:"",status:"active"}],{
   newReferrals:group,registration:{...group,people:[]},fetchedAt:0,
 })).toHaveLength(1);
});
