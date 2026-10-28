import { queryOptions } from "@tanstack/react-query";
import { getAccess, getSheetTabs, getDailyForms, getDailyCoordination, getStaffDailyCompleteness,getInsijamDailyCompleteness,getStateReportForYesterday } from "./sheets.functions";

export const REFRESH_MS = 60_000;

export const accessQuery = queryOptions({
  queryKey: ["access"],
  queryFn: () => getAccess(),
  staleTime: 5 * 60_000,
  retry: false,
});

export const sheetQuery = (slugs: string[], refreshMs = REFRESH_MS) =>
  queryOptions({
    queryKey: ["sheet", ...slugs],
    queryFn: () => getSheetTabs({ data: { slugs } }),
    refetchInterval: refreshMs,
    refetchIntervalInBackground: false,
    retry: (count, err) => !String((err as Error)?.message).includes("ACCESS_DENIED") && count < 2,
  });

export const dailyFormsQuery = (refreshMs = REFRESH_MS) => queryOptions({
  queryKey: ["daily-forms"],
  queryFn: () => getDailyForms(),
  refetchInterval: refreshMs,
  refetchIntervalInBackground: false,
  retry: 1,
});

export const dailyCoordinationQuery = (refreshMs = REFRESH_MS) => queryOptions({
  queryKey: ["daily-coordination"],
  queryFn: () => getDailyCoordination(),
  refetchInterval: refreshMs,
  refetchIntervalInBackground: false,
  retry: 1,
});

export const staffCompletenessQuery = (refreshMs=REFRESH_MS) => queryOptions({
 queryKey:["staff-report-completeness"],
 queryFn:()=>getStaffDailyCompleteness(),
 refetchInterval:refreshMs,
 refetchIntervalInBackground:false,
 retry:1,
 staleTime:5_000,
});

export const insijamCompletenessQuery=(refreshMs=REFRESH_MS)=>queryOptions({
 queryKey:["insijam-report-completeness"],
 queryFn:()=>getInsijamDailyCompleteness(),
 refetchInterval:refreshMs,refetchIntervalInBackground:false,retry:1,staleTime:5000,
});
export const stateReportQuery=(refreshMs=REFRESH_MS)=>queryOptions({
 queryKey:["state-report-yesterday"],
 queryFn:()=>getStateReportForYesterday(),
 refetchInterval:refreshMs,refetchIntervalInBackground:false,retry:1,staleTime:5000,
});
export function errorText(err: unknown): string {
  const m = String((err as Error)?.message ?? err);
  if (m.includes("ACCESS_DENIED")) return "لاسرسی رد شو: ستاسو ایمیل د مالک په لیست کې نشته.";
  if (m.includes("INSIJAM_SHEETS_ERROR_403") || m.includes("INSIJAM_SHEETS_ERROR_404")) return "د انسجام نوي Google Sheet ته د لوستلو اجازه نه ده ورکړل شوې.";
  if (m.includes("INSIJAM_SHEETS_ERROR")) return "د انسجام میاشتنی راپور ونه لوستل شو.";
  if (m.includes("STATE_REPORT_ERROR")) return "د «ریاست ته ګزارش» اصلي ټاب ونه لوستل شو.";
  if (m.includes("STAFF_SHEETS_ERROR_403") || m.includes("STAFF_SHEETS_ERROR_404")) return "د کارمندانو نوي Google Sheet ته د لوستلو اجازه نشته. د Lovable Google اتصال کې ورته لاسرسی ورکړئ.";
  if (m.includes("STAFF_SHEETS_ERROR")) return "د کارمندانو میاشتنی راپور ونه لوستل شو.";
  if (m.includes("SHEETS_NOT_CONNECTED")) return "د ګوګل شیټ اړیکه نه ده جوړه شوې.";
  if (m.includes("COORDINATION_SHEETS_ERROR_403") || m.includes("COORDINATION_SHEETS_ERROR_404")) return "د هماهنګۍ Google Sheet ته د لوستلو اجازه نشته.";
  if (m.includes("COORDINATION_SHEETS_ERROR")) return "د ثبت نام هماهنګۍ ورځنی راپور ونه لوستل شو.";
  if (m.includes("FORMS_SHEETS_ERROR_403") || m.includes("FORMS_SHEETS_ERROR_404")) return "دویم Google Sheet ته د لوستلو اجازه نشته.";
  if (m.includes("FORMS_SHEETS_ERROR")) return "د ورځنیو فورمونو شیټ لوستل ناکام شول.";
  if (m.includes("SHEETS_ERROR_429")) return "د ګوګل محدودیت؛ لږ وروسته به بیا هڅه وشي.";
  if (m.includes("SHEETS_ERROR_403") || m.includes("SHEETS_ERROR_404")) return "شیټ ته لاسرسی نشته — د شیټ اجازه وګورئ.";
  if (m.includes("SHEETS_ERROR")) return "د شیټ لوستل ناکام شول.";
  return "د سرور سره اړیکه ناکامه شوه.";
}
