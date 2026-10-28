import {describe,it,expect} from "vitest";
import {findInsijamMonth,inspectInsijamDay,hasSubmittedInsijamValue} from "./insijam-completeness";
const header=["شماره","اسم","ولد","وظیفه","تقسیم بندی ",1,2,3,4,5];
const grid:unknown[][]=[
 ["اداره"],["شهرت کارمندان"],["گزارش ماه (عقرب)"],header,
 [1,"محمد علی سکندری","پدر","چک اسناد","تمام دوسیه متقاضیان",12,10,10,5,83],
 [2,"تمنا ناب","پدر","چک اسناد","تمام دوسیه متقاضیان",5,6,5,3,41],
 [3,null,null,"چک اسناد","تمام دوسیه متقاضیان",null,null,null,null,null],
 [4,null,null,"چک اسناد","تمام دوسیه متقاضیان",null,null,null,null,null],
 [5,"معاذالله افشار","پدر","هماهنگی","راجع سازی به تیمها",9,7,8,7,59],
 [6,"موسی ایوب زاده","پدر","تثبیت هویت","مطابق تذکره کاغذی",3,2,4,5,38],
 [null,null,null,null,"مطابق کارت تولد",1,2,0,2,5],
 [null,null,null,null,"تعین سن نظر به چهره ظاهری",0,0,0,1,0],
 [17,"نیک محمد کریمی","پدر","سکن","فی سکنر 1000 صفحه",8,9,4,3,null],
 [18,"جاوید ملکزاد","پدر","آرشیف","دیتابیس و بسته بندی (عادی)",2,3,4,5,null],
 [null,null,null,"آرشیف","خدمات",2,3,4,5,null],
];
describe("insijam monthly staff completeness",()=>{
 it("finds proper month by exact year and name",()=>{
  expect(findInsijamMonth(["میزان 1405","عقرب 1405","عقرب 1404"],8)).toBe("عقرب 1405");
 });
 it("ignores physical sheet rows seven/eight and Javed Malekzada",()=>{
  const result=inspectInsijamDay(grid,{y:1405,m:8,d:5},"عقرب 1405");
  expect(result.totalCount).toBe(5);
  expect(result.missing.map(x=>x.name)).toEqual(["نیک محمد کریمی"]);
  expect(result.staff.find(x=>x.name.includes("جاوید"))).toBeUndefined();
 });
 it("treats explicitly recorded zero as submitted",()=>{
  const copy=grid.map(row=>[...row]);
  copy[12]![9]=0;
  const result=inspectInsijamDay(copy,{y:1405,m:8,d:5},"عقرب 1405");
  expect(result.status).toBe("complete");
 });
 it("recognizes money-formatted reports including Afghanis and does not treat blank as submitted",()=>{
  expect(hasSubmittedInsijamValue("؋ 49,500")).toBe(true);
  expect(hasSubmittedInsijamValue("؋ 6,000")).toBe(true);
  expect(hasSubmittedInsijamValue("AFN 0")).toBe(true);
  expect(hasSubmittedInsijamValue("جمعه")).toBe(false);
  expect(hasSubmittedInsijamValue(null)).toBe(false);
 });
 it("includes monetary employee amounts in monthly report completeness",()=>{
  const copy=grid.map(row=>[...row]);
  copy.push([19,"احمد سروش","پدر","عواید (مبلغ)","عواید روند عادی",1,2,3,4,"؋ 49,500"]);
  copy.push([20,"رمضان امینی","پدر","عواید (مبلغ)","عواید خدمات",1,2,3,4,"؋ 6,000"]);
  const result=inspectInsijamDay(copy,{y:1405,m:8,d:5},"عقرب 1405");
  expect(result.missing.map(x=>x.name)).not.toContain("احمد سروش");
  expect(result.missing.map(x=>x.name)).not.toContain("رمضان امینی");
 });
});
