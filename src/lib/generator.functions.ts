import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isEmailAllowed } from "./access";
import type { MeterReading, VerifiedDelivery } from "./generator-model";

const KNOWN = ["READING_BEFORE_BASELINE", "READING_IN_FUTURE", "METER_BELOW_BASELINE", "READING_NOT_CHRONOLOGICAL", "METER_NOT_MONOTONIC", "DELIVERY_BEFORE_BASELINE", "DELIVERY_IN_FUTURE", "APPEND_ONLY"];
function authorize(context: { claims: unknown }) {
  const claims = context.claims as { email?: string } | null;
  if (!isEmailAllowed(claims?.email ?? null, process.env["OWNER_EMAILS"])) throw new Error("ACCESS_DENIED");
}
function dbError(message: string, fallback: string): never {
  throw new Error(KNOWN.find(k => message.includes(k)) ?? fallback);
}
const isIso = (s: unknown) => typeof s === "string" && s.length <= 40 && Number.isFinite(Date.parse(s));
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const getGeneratorData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<{ readings: MeterReading[]; deliveries: VerifiedDelivery[] }> => {
  setResponseHeader("Cache-Control", "private, no-store"); authorize(context);
  const db = context.supabase as unknown as SupabaseClient;
  const [r, d] = await Promise.all([
    db.from("generator_meter_readings").select("id,reading_at,meter_hours,rate_lph,measured_liters,note,created_at").eq("user_id", context.userId).order("reading_at", { ascending: true }).limit(5000),
    db.from("generator_diesel_deliveries").select("id,delivered_at,liters,reference_no,supplier,note,created_at").eq("user_id", context.userId).order("delivered_at", { ascending: true }).limit(5000),
  ]);
  if (r.error || d.error) throw new Error("GENERATOR_READ_FAILED");
  return {
    readings: (r.data ?? []).map(x => ({ ...x, meter_hours: Number(x.meter_hours), rate_lph: Number(x.rate_lph), measured_liters: num(x.measured_liters) })) as MeterReading[],
    deliveries: (d.data ?? []).map(x => ({ ...x, liters: Number(x.liters) })) as VerifiedDelivery[],
  };
});

type ReadingInput = { reading_at: string; meter_hours: number; rate_lph: number; measured_liters: number | null; note?: string };
export const addMeterReading = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .validator((x: ReadingInput) => {
    if (!x || !isIso(x.reading_at) || typeof x.meter_hours !== "number" || !Number.isFinite(x.meter_hours) || x.meter_hours < 5113 || x.meter_hours > 1000000
      || typeof x.rate_lph !== "number" || !Number.isFinite(x.rate_lph) || x.rate_lph <= 0 || x.rate_lph > 100
      || (x.measured_liters !== null && (typeof x.measured_liters !== "number" || !Number.isFinite(x.measured_liters) || x.measured_liters < 0 || x.measured_liters > 100000))
      || String(x.note ?? "").length > 2000) throw new Error("INVALID_READING");
    return x;
  })
  .handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "private, no-store"); authorize(context);
    const db = context.supabase as unknown as SupabaseClient;
    const { error } = await db.from("generator_meter_readings").insert({ user_id: context.userId, reading_at: data.reading_at, meter_hours: data.meter_hours, rate_lph: data.rate_lph, measured_liters: data.measured_liters, note: data.note || null });
    if (error) dbError(error.message, "READING_WRITE_FAILED");
    return { ok: true };
  });

type DeliveryInput = { delivered_at: string; liters: number; reference_no: string; supplier?: string; note?: string };
export const addVerifiedDelivery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .validator((x: DeliveryInput) => {
    if (!x || !isIso(x.delivered_at) || typeof x.liters !== "number" || !Number.isFinite(x.liters) || x.liters <= 0 || x.liters > 100000
      || typeof x.reference_no !== "string" || !x.reference_no.trim() || x.reference_no.length > 120
      || String(x.supplier ?? "").length > 180 || String(x.note ?? "").length > 2000) throw new Error("INVALID_DELIVERY");
    return x;
  })
  .handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "private, no-store"); authorize(context);
    const db = context.supabase as unknown as SupabaseClient;
    const { error } = await db.from("generator_diesel_deliveries").insert({ user_id: context.userId, delivered_at: data.delivered_at, liters: data.liters, reference_no: data.reference_no, supplier: data.supplier || null, note: data.note || null });
    if (error) dbError(error.message, "DELIVERY_WRITE_FAILED");
    return { ok: true };
  });
