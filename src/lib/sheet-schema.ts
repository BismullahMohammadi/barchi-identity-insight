/** Verified against the source spreadsheet's actual 1405 headers (0-based A=0). */
export type SheetSchema = {
  headerRow: number;
  dateCol: number;
  labelCol: number;
  metrics: number[];
  primary: number;
  chartMetrics?: number[];
  transpose?: boolean;
};
export const SHEET_SCHEMAS: Record<string, SheetSchema> = {
  "مجموعی راپور": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [3,1,2,5,7], primary: 3, chartMetrics:[3,1,5] },
  "تثبت هویت": { headerRow: 2, dateCol: 0, labelCol: 0, metrics: [9,2,4,5,6,7,8], primary: 9, chartMetrics:[9] },
  "عواید": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [5,3], primary: 5 },
  "بانکي عواید": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [6,1,2,3], primary: 6 },
  "کنټرول": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [6,1,2,3,4,5], primary: 6 },
  "خدمات": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [5,1,2,3,4,6], primary: 5, chartMetrics:[5,1,2,3,4] },
  "توزیع": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [3,1,2], primary: 3 },
  "پاس شوي دوسیې (هفته وار)": { headerRow: 2, dateCol: 0, labelCol: 2, metrics: [3,4,5,6], primary: 3 },
  "کالنی ګزارش": { headerRow: 2, dateCol: -1, labelCol: 1, metrics: [14,4,2,12,13], primary: 14, chartMetrics:[14,12,13] },
  "ریاست ته ګزارش": { headerRow: 0, dateCol: -1, labelCol: 0, metrics: [], primary: -1, transpose: true },
  "مصرف دیزل": { headerRow: 3, dateCol: 1, labelCol: 3, metrics: [6,4], primary: 6 },
  "راسیدلې تذکرې": { headerRow: 3, dateCol: 0, labelCol: 0, metrics: [2,3], primary: 2 },
  "د خدمات عواید تصفه حساب": { headerRow: 2, dateCol: 0, labelCol: 0, metrics: [5,1,2,3], primary: 5 }
};
export function sheetSchema(title: string): SheetSchema | undefined {
  return SHEET_SCHEMAS[title];
}
