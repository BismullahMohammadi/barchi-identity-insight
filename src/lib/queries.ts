import { queryOptions } from "@tanstack/react-query";
import { getAccess, getSheetTabs } from "./sheets.functions";

export const REFRESH_MS = 60_000;

export const accessQuery = queryOptions({
  queryKey: ["access"],
  queryFn: () => getAccess(),
  staleTime: 5 * 60_000,
  retry: false,
});

export const sheetQuery = (slugs: string[]) =>
  queryOptions({
    queryKey: ["sheet", ...slugs],
    queryFn: () => getSheetTabs({ data: { slugs } }),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: (count, err) => !String((err as Error)?.message).includes("ACCESS_DENIED") && count < 2,
  });

export function errorText(err: unknown): string {
  const m = String((err as Error)?.message ?? err);
  if (m.includes("ACCESS_DENIED")) return "لاسرسی رد شو: ستاسو ایمیل د مالک په لیست کې نشته.";
  if (m.includes("SHEETS_NOT_CONNECTED")) return "د ګوګل شیټ اړیکه نه ده جوړه شوې.";
  if (m.includes("SHEETS_ERROR_429")) return "د ګوګل محدودیت؛ لږ وروسته به بیا هڅه وشي.";
  if (m.includes("SHEETS_ERROR_403") || m.includes("SHEETS_ERROR_404")) return "شیټ ته لاسرسی نشته — د شیټ اجازه وګورئ.";
  if (m.includes("SHEETS_ERROR")) return "د شیټ لوستل ناکام شول.";
  return "د سرور سره اړیکه ناکامه شوه.";
}
