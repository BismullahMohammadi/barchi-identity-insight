import { queryOptions } from "@tanstack/react-query";
import { getAccess, getSheetTabs, getDailyForms, getDailyCoordination } from "./sheets.functions";

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

export function errorText(err: unknown): string {
  const m = String((err as Error)?.message ?? err);
  if (m.includes("ACCESS_DENIED")) return "لاسرسی رد شو: ستاسو ایمیل د مالک په لیست کې نشته.";
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
