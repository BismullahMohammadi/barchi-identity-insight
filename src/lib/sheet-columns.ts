/**
 * Verified against the real 1405 Google Sheets header rows (zero-based indices).
 * Do not guess metrics from the first numeric column: columns contain different
 * units (AFN, people, tariff counts, fees, duplicates and totals).
 */
export type SheetColumns = {
  headerRow: number;
  dateCol: number;
  labelCol: number;
  metricCols: number[];
  primaryCol: number | null;
  expectedHeaders: Record<number,string>;
};
export const SHEET_COLUMNS: Record<string, SheetColumns> = {
  "مجموعی راپور": { headerRow:3,dateCol:0,labelCol:0,metricCols:[1,2,3,4,5,6,7],primaryCol:3, expectedHeaders:{0:"نېټه",1:"تعرفې",2:"عواید",3:"پاس شوي",5:"توزیع"} },
  "تثبت هویت": { headerRow:2,dateCol:0,labelCol:0,metricCols:[10],primaryCol:10,expectedHeaders:{0:"نېټه",9:"مجموعه",10:"جمله"} },
  "عواید": { headerRow:3,dateCol:0,labelCol:0,metricCols:[3,5],primaryCol:5,expectedHeaders:{0:"نیټه",3:"تعروفو شمیر (بانکي او تعرفې)",5:"لاسته راغلي عواید"} },
  "بانکي عواید": {headerRow:3,dateCol:0,labelCol:0,metricCols:[1,2,3,4,5,6],primaryCol:6,expectedHeaders:{0:"نېټه",1:"جدید او ثبت تولد",6:"مجموعه"}},
  "کنټرول": {headerRow:3,dateCol:0,labelCol:0,metricCols:[1,2,3,4,5,6],primaryCol:6,expectedHeaders:{0:"نیټه",6:"مجموعه"}},
  "خدمات": {headerRow:3,dateCol:0,labelCol:0,metricCols:[1,2,3,4,5,6],primaryCol:5,expectedHeaders:{0:"نیټه",5:"مجموعه",6:"عواید (مثنی، تجدید)"}},
  "توزیع": {headerRow:3,dateCol:0,labelCol:0,metricCols:[1,2,3],primaryCol:3,expectedHeaders:{0:"نیټه",3:"مجموعه"}},
  "پاس شوي دوسیې (هفته وار)": {headerRow:2,dateCol:0,labelCol:0,metricCols:[3,4,5,6],primaryCol:3,expectedHeaders:{0:"له نېټې",1:"تر نېټې",2:"هفته",3:"جدید او ثبت تولد"}},
  "کالنی ګزارش": {headerRow:2,dateCol:-1,labelCol:1,metricCols:[2,4,5,6,7,8,9,10,11,12,13,14],primaryCol:14,expectedHeaders:{0:"ربعه",1:"میاشت",2:"تثبیت هویت",14:"مجموعي عواید"}},
  // Matrix format: column A is the service, columns B:AE are days,
  // column AG is the per-service total. Never sum day and total columns together.
  "ریاست ته ګزارش": {headerRow:0,dateCol:-1,labelCol:0,metricCols:[],primaryCol:null,expectedHeaders:{0:"بخشونه (میزان ۷)",32:"جمله"}},
  "مصرف دیزل": {headerRow:3,dateCol:1,labelCol:3,metricCols:[4,5,6],primaryCol:6,expectedHeaders:{1:"له نېټې",3:"میاشت",6:"مصرف تیل"}},
  "راسیدلې تذکرې": {headerRow:3,dateCol:0,labelCol:0,metricCols:[2,3],primaryCol:2,expectedHeaders:{0:"نیټه",2:"تذکرو تعداد"}},
  "د خدمات عواید تصفه حساب": {headerRow:2,dateCol:0,labelCol:0,metricCols:[1,2,3,5],primaryCol:5,expectedHeaders:{0:"نېټه",5:"عواید"}},
};
export function headerMatches(actual:string, expected:string):boolean {
  return actual.replace(/\s+/g,"").trim()===expected.replace(/\s+/g,"").trim();
}
