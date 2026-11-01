import { describe, expect, it } from "vitest";
import { GENERATOR_BASELINE, computeModel, isoToKabulJalali, jalaliToGregorian, kabulJalaliToIso, validateReading, type MeterReading, type VerifiedDelivery } from "./generator-model";

const reading = (at: string, hours: number, rate = 3.5, measured: number | null = null): MeterReading =>
  ({ id: at, reading_at: at, meter_hours: hours, rate_lph: rate, measured_liters: measured, note: null, created_at: at });
const delivery = (at: string, liters: number): VerifiedDelivery =>
  ({ id: at, delivered_at: at, liters, reference_no: "R-1", supplier: null, note: null, created_at: at });

describe("generator baseline", () => {
  it("1405/06/31 is Gregorian 2026-09-22", () => {
    expect(jalaliToGregorian({ y: 1405, m: 6, d: 31 })).toBe("2026-09-22");
    expect(GENERATOR_BASELINE.gregorian).toBe("2026-09-22");
  });
  it("converts Kabul Jalali time to UTC and back", () => {
    const iso = kabulJalaliToIso({ y: 1405, m: 7, d: 1 }, "08:00")!;
    expect(iso).toBe("2026-09-23T03:30:00.000Z");
    expect(isoToKabulJalali(iso)).toBe("1405/07/01 08:00");
  });
});

describe("generator model", () => {
  it("is unknown (null) before any post-baseline reading", () => {
    expect(computeModel([], []).estimatedBalance).toBeNull();
  });
  it("497 L − 10 h × 3.5 = 462 L", () => {
    expect(computeModel([reading("2026-09-23T03:30:00.000Z", 5123)], []).estimatedBalance).toBe(462);
  });
  it("applies each interval's own rate (rate change support)", () => {
    const m = computeModel([reading("2026-09-23T03:30:00.000Z", 5123, 3.5), reading("2026-09-25T03:30:00.000Z", 5133, 4)], []);
    expect(m.totalModeled).toBe(75);
    expect(m.estimatedBalance).toBe(422);
  });
  it("adds only confirmed deliveries after the baseline", () => {
    const m = computeModel([reading("2026-09-25T03:30:00.000Z", 5123)], [delivery("2026-09-24T03:30:00.000Z", 200), delivery("2026-09-20T03:30:00.000Z", 510)]);
    expect(m.totalDelivered).toBe(200);
    expect(m.estimatedBalance).toBe(662);
  });
  it("reports measured − estimated discrepancy", () => {
    const m = computeModel([reading("2026-09-23T03:30:00.000Z", 5123, 3.5, 450)], []);
    expect(m.rows[0]!.discrepancy).toBe(-12);
  });
});

describe("reading validation", () => {
  const now = Date.parse("2026-10-01T00:00:00.000Z");
  it("rejects meter below 5113", () => {
    expect(validateReading({ reading_at: "2026-09-23T03:30:00.000Z", meter_hours: 5112.9, rate_lph: 3.5, measured_liters: null }, [], now)).toBe("METER_BELOW_BASELINE");
  });
  it("rejects a decreasing meter", () => {
    expect(validateReading({ reading_at: "2026-09-26T03:30:00.000Z", meter_hours: 5120, rate_lph: 3.5, measured_liters: null }, [reading("2026-09-25T03:30:00.000Z", 5130)], now)).toBe("METER_NOT_MONOTONIC");
  });
  it("rejects a reading not after the last one", () => {
    expect(validateReading({ reading_at: "2026-09-24T03:30:00.000Z", meter_hours: 5140, rate_lph: 3.5, measured_liters: null }, [reading("2026-09-25T03:30:00.000Z", 5130)], now)).toBe("READING_NOT_CHRONOLOGICAL");
  });
  it("accepts a valid next reading", () => {
    expect(validateReading({ reading_at: "2026-09-26T03:30:00.000Z", meter_hours: 5130, rate_lph: 3.5, measured_liters: null }, [reading("2026-09-25T03:30:00.000Z", 5130)], now)).toBeNull();
  });
});
