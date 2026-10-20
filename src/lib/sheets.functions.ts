import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import { SPREADSHEET_ID, TABS } from "./tabs";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

function emailFromClaims(claims: unknown): string | null {
  const e = (claims as { email?: unknown } | null)?.email;
  return typeof e === "string" ? e : null;
}

export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const email = emailFromClaims(context.claims);
    const allowlistConfigured = !!process.env["OWNER_EMAILS"]?.trim();
    return { email, allowed: isEmailAllowed(email, process.env["OWNER_EMAILS"]), allowlistConfigured };
  });

export type SheetPayload = {
  fetchedAt: number;
  tabs: { slug: string; title: string; grid: string[][] }[];
};

export const getSheetTabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slugs: string[] }) => {
    if (!input || !Array.isArray(input.slugs) || input.slugs.length === 0 || input.slugs.length > 12) {
      throw new Error("Invalid tabs");
    }
    const slugs = input.slugs.filter((s) => TABS.some((t) => t.slug === s));
    if (slugs.length !== input.slugs.length) throw new Error("Unknown tab");
    return { slugs };
  })
  .handler(async ({ data, context }): Promise<SheetPayload> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const email = emailFromClaims(context.claims);
    if (!isEmailAllowed(email, process.env["OWNER_EMAILS"])) {
      throw new Error("ACCESS_DENIED");
    }
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) throw new Error("SHEETS_NOT_CONNECTED");

    const tabs = data.slugs.map((s) => TABS.find((t) => t.slug === s)!);
    const params = new URLSearchParams();
    tabs.forEach((t) => params.append("ranges", `'${t.title.replace(/'/g, "''")}'!A1:AL400`));
    params.set("valueRenderOption", "FORMATTED_VALUE");
    params.set("majorDimension", "ROWS");

    // Read-only GET; this app never writes to the source sheet.
    const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${params}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": sheetsKey },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets read failed [${res.status}]: ${body}`);
      throw new Error(`SHEETS_ERROR_${res.status}`);
    }
    const json = (await res.json()) as { valueRanges?: { values?: string[][] }[] };
    return {
      fetchedAt: Date.now(),
      tabs: tabs.map((t, i) => ({ slug: t.slug, title: t.title, grid: json.valueRanges?.[i]?.values ?? [] })),
    };
  });
