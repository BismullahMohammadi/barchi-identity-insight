import { queryOptions } from "@tanstack/react-query";
import {readReferralCellPreference,readSourceCell,REGISTRATION_CELL_KEY} from "./referral-cell";
import { getAccess, getSheetTabs, getDailyForms, getDailyCoordination, getStaffDailyCompleteness,getInsijamDailyCompleteness,getStateReportForYesterday,getRecentReferrals } from "./sheets.functions";

export const REFRESH_MS = 60_000;

export const accessQuery = queryOptions({
  queryKey: ["access"],
  queryFn: () => getAccess(),
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
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
  queryFn: () => getDailyForms({data:{cell:readReferralCellPreference(),nonce:Date.now()}}),
  refetchInterval: refreshMs,
  refetchIntervalInBackground: false,
  retry: 1,
});

export const dailyCoordinationQuery = (refreshMs = REFRESH_MS) => queryOptions({
  queryKey: ["daily-coordination"],
  queryFn: () => getDailyCoordination({data:{cell:readSourceCell(REGISTRATION_CELL_KEY),nonce:Date.now()}}),
  refetchInterval: refreshMs,
  refetchIntervalInBackground: false,
  retry: 1,
});

export const recentReferralsQuery=(refreshMs=REFRESH_MS)=>queryOptions({
 queryKey:["recent-referrals"],
 queryFn:({signal})=>getRecentReferrals({signal}),
 staleTime:30_000,refetchInterval:refreshMs,refetchIntervalInBackground:false,retry:1,
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
  if (m.includes("ACCESS_DENIED")) return "د دې برخې د لیدلو لپاره له عمومي مدیر څخه اجازه وغواړئ.";
  if (m.includes("INSIJAM_SHEETS_ERROR_403") || m.includes("INSIJAM_SHEETS_ERROR_404")) return "د انسجام شیټ ونه موندل شو یا د لیدلو اجازه نده درکول شوي.";
  if (m.includes("INSIJAM_SHEETS_ERROR")) return "د انسجام میاشتنی راپور ونه لوستل شو.";
  if (m.includes("STATE_REPORT_ERROR")) return "د «ریاست ته ګزارش» اصلي ټاب ونه لوستل شو.";
  if (m.includes("STAFF_SHEETS_ERROR_403") || m.includes("STAFF_SHEETS_ERROR_404")) return "د کارمندانو نوي Google Sheet ته د لوستلو اجازه نشته. د Lovable Google اتصال کې ورته لاسرسی ورکړئ.";
  if (m.includes("STAFF_SHEETS_ERROR")) return "د کارمندانو میاشتنی راپور ونه لوستل شو.";
  if (m.includes("SHEETS_NOT_CONNECTED")) return "د Google Sheets د سرور اتصال نیمګړی دی؛ LOVABLE_API_KEY او GOOGLE_SHEETS_API_KEY تنظیم کړئ.";
  if (m.includes("REFERRAL_CELL_NOT_FOUND")) return "د نویو معرفي شویو مراجعینو سیل ونه موندل شو. تنظیمات ← Google Sheets کې یې وازمویئ.";
  if (m.includes("INVALID_REFERRAL_CELL")) return "د سیل پته ناسمه ده. بېلګه: AM2 یا G3.";
  if (m.includes("COORDINATION_CELL_NOT_NUMERIC")) return "د ثبت‌نام همغږۍ د شمېر سیل عدد نه لري. تنظیمات ← Google Sheets کې یې وازمویئ.";
  if (m.includes("COORDINATION_SHEETS_ERROR_403") || m.includes("COORDINATION_SHEETS_ERROR_404")) return "د همغږۍ شیټ ونه موندل شو یا د لوستلو اجازه نشته.";
  if (m.includes("COORDINATION_SHEETS_ERROR")) return "د ثبت‌نام د همغږۍ ورځنی راپور ونه لوستل شو.";
  if (m.includes("FORMS_SHEETS_ERROR_403") || m.includes("FORMS_SHEETS_ERROR_404")) return "د ورځنیو فورمو شیټ ونه موندل شو یا د لوستلو اجازه نشته.";
  if (m.includes("FORMS_SHEETS_ERROR")) return "د ورځنیو فورمونو شیټ لوستل ناکام شول.";
  if (m.includes("SHEETS_ERROR_429")) return "ګوګل د غوښتنو شمېر محدود کړی. لږ وروسته بیا هڅه وکړئ.";
  if (m.includes("ARCHIVE_TAB_MISSING")) return "د آرشیف سکن ټاب په Google Sheet کې ونه موندل شو؛ د ټاب نوم یا د اتصال اجازه وګورئ.";
  if (m.includes("SHEETS_ERROR_403") || m.includes("SHEETS_ERROR_404")) return "شیټ ته لاسرسی نشته — د شیټ اجازه وګورئ.";
  if (m.includes("SHEETS_ERROR")) return "د شیټ لوستل ناکام شول.";
  return "له سرور سره اړیکه ټینګه نه شوه.";
}
