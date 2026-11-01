import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Gauge, PackagePlus, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getGeneratorData, addMeterReading, addVerifiedDelivery } from "@/lib/generator.functions";
import { GENERATOR_BASELINE, computeModel, isoToKabulJalali, kabulJalaliToIso, validateReading } from "@/lib/generator-model";
import { parseJalali, formatJ, todayJalali, jKey } from "@/lib/jalali";
import type { DieselDelivery } from "@/lib/diesel-sheet.functions";

const fmt = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 2 });
const nowTime = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kabul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const MSG: Record<string, string> = {
  METER_BELOW_BASELINE: "د ساعت شمېرونکي عدد باید له ۵۱۱۳ څخه کم نه وي.",
  METER_NOT_MONOTONIC: "د ساعت شمېرونکی عدد له وروستي ثبت څخه کم دی؛ شمېرونکی شاته نه ځي.",
  READING_NOT_CHRONOLOGICAL: "نېټه/وخت باید له وروستي ثبت شوي لوستلو وروسته وي.",
  READING_BEFORE_BASELINE: "لوستنه باید له ۱۴۰۵/۰۶/۳۱ وروسته وي.",
  READING_IN_FUTURE: "راتلونکې نېټه نه شي ثبتېدای.",
  DELIVERY_BEFORE_BASELINE: "یوازې له ۱۴۰۵/۰۶/۳۱ وروسته راوړل شوي ډیزل دلته ثبتېږي.",
  DELIVERY_IN_FUTURE: "راتلونکې نېټه نه شي ثبتېدای.",
  INVALID_RATE: "د لیتر/ساعت سمه اندازه ولیکئ (۰ – ۱۰۰).",
  INVALID_MEASURED: "د فزیکي اندازې لیترونه سم نه دي.",
  INVALID_DATE: "نېټه د ۱۴۰۵/۰۷/۰۱ په بڼه او وخت د ۰۸:۳۰ په بڼه ولیکئ.",
};
const msg = (e: unknown) => { const s = String(e instanceof Error ? e.message : e); const k = Object.keys(MSG).find(x => s.includes(x)); return k ? MSG[k]! : "ثبت ناکام شو؛ اړیکه یا معلومات وګورئ."; };

export function GeneratorModelPanel({ sheetDeliveries }: { sheetDeliveries: DieselDelivery[] }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["generator-model"], queryFn: () => getGeneratorData(), refetchInterval: 60000 });
  const readings = q.data?.readings ?? [];
  const deliveries = q.data?.deliveries ?? [];
  const model = useMemo(() => computeModel(readings, deliveries), [readings, deliveries]);
  const lastRate = readings.at(-1)?.rate_lph ?? GENERATOR_BASELINE.rateLph;
  const lastHours = readings.at(-1)?.meter_hours ?? GENERATOR_BASELINE.meterHours;

  const [rDate, setRDate] = useState(() => formatJ(todayJalali()));
  const [rTime, setRTime] = useState(nowTime);
  const [meter, setMeter] = useState("");
  const [rate, setRate] = useState("");
  const [measured, setMeasured] = useState("");
  const [rNote, setRNote] = useState("");
  const [rErr, setRErr] = useState("");
  const [dDate, setDDate] = useState(() => formatJ(todayJalali()));
  const [dTime, setDTime] = useState(nowTime);
  const [dLiters, setDLiters] = useState("");
  const [dRef, setDRef] = useState("");
  const [dSupplier, setDSupplier] = useState("");
  const [dNote, setDNote] = useState("");
  const [dErr, setDErr] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["generator-model"] });
  const readingM = useMutation({ mutationFn: addMeterReading, onSuccess: async () => { setMeter(""); setMeasured(""); setRNote(""); setRate(""); setRErr(""); await refresh(); }, onError: e => setRErr(msg(e)) });
  const deliveryM = useMutation({ mutationFn: addVerifiedDelivery, onSuccess: async () => { setDLiters(""); setDRef(""); setDSupplier(""); setDNote(""); setDErr(""); await refresh(); }, onError: e => setDErr(msg(e)) });

  async function submitReading(e: React.FormEvent) {
    e.preventDefault(); setRErr("");
    const j = parseJalali(rDate); const iso = j ? kabulJalaliToIso(j, rTime) : null;
    if (!iso) { setRErr(MSG["INVALID_DATE"]!); return; }
    const payload = { reading_at: iso, meter_hours: Number(meter), rate_lph: rate ? Number(rate) : lastRate, measured_liters: measured.trim() ? Number(measured) : null, note: rNote };
    const v = validateReading(payload, readings);
    if (v) { setRErr(MSG[v] ?? "معلومات سم نه دي."); return; }
    if (!window.confirm(`تایید: ${rDate} ${rTime} — شمېرونکی ${meter} ساعته، ${payload.rate_lph} لیتر/ساعت. ثبت وروسته نه بدلېږي.`)) return;
    await readingM.mutateAsync({ data: payload }).catch(() => {});
  }
  async function submitDelivery(e: React.FormEvent) {
    e.preventDefault(); setDErr("");
    const j = parseJalali(dDate); const iso = j ? kabulJalaliToIso(j, dTime) : null;
    if (!iso) { setDErr(MSG["INVALID_DATE"]!); return; }
    const liters = Number(dLiters);
    if (!Number.isFinite(liters) || liters <= 0) { setDErr("د لیترو سمه اندازه ولیکئ."); return; }
    if (!dRef.trim()) { setDErr("د تایید شوي رسید/سند شمېره اړینه ده."); return; }
    if (Date.parse(iso) <= Date.parse(GENERATOR_BASELINE.at)) { setDErr(MSG["DELIVERY_BEFORE_BASELINE"]!); return; }
    if (!window.confirm(`تایید: ${fmt(liters)} لیتره ډیزل په ${dDate} — سند ${dRef}. دا یوازې هغه وخت ثبت کړئ چې تسلیمي جلا تایید شوې وي.`)) return;
    await deliveryM.mutateAsync({ data: { delivered_at: iso, liters, reference_no: dRef.trim(), supplier: dSupplier, note: dNote } }).catch(() => {});
  }

  const baselineKey = 14050631;
  const sheetDate = (d: DieselDelivery) => parseJalali(d.date) ?? parseJalali((`${d.date} ${d.document}`.match(/14\d\d\/\d{1,2}\/\d{1,2}/) ?? [""])[0]);
  const sheetUncounted = sheetDeliveries.filter(d => {
    if (d.isCarryover) return false;
    const j = sheetDate(d); return !j || jKey(j) > baselineKey || d.liters === 510;
  });
  const staleDays = model.lastReadingAt ? Math.floor((Date.now() - Date.parse(model.lastReadingAt)) / 86400000) : null;
  const gaps: string[] = [];
  if (!readings.length) gaps.push("له ۱۴۰۵/۰۶/۳۱ وروسته د ساعت شمېرونکي هېڅ لوستنه نه ده ثبت شوې — اوسنۍ موجودي نامعلومه ده.");
  if (staleDays !== null && staleDays > 7) gaps.push(`وروستۍ لوستنه ${fmt(staleDays)} ورځې مخکې ده — اټکل زوړ دی.`);
  if (readings.length && !model.lastMeasured) gaps.push("له مبدا وروسته هېڅ فزیکي اندازه‌ګیري نه ده ثبت شوې — اټکل نه دی تایید شوی.");
  if (!deliveries.length) gaps.push("له مبدا وروسته هېڅ تایید شوی راوړل شوی ډیزل نه دی ثبت شوی. که ډیزل راغلی وي، اټکل ټیټ ښودل کېږي.");
  if (model.pendingDeliveries.length) gaps.push(`${fmt(model.pendingDeliveries.length)} تایید شوی راوړل له وروستۍ لوستنې وروسته دی؛ تر راتلونکې لوستنې پورې په اټکل کې نه شمېرل کېږي.`);
  if (sheetUncounted.length) gaps.push(`په Google Sheet کې ${fmt(sheetUncounted.length)} راوړل شوي ثبتونه شته چې له مبدا وروسته، بې‌نېټې یا متنازع (۵۱۰ لیتره) دي — په اټکل کې نه شمېرل کېږي تر څو جلا تایید او دلته ثبت نه شي.`);

  return <section className="space-y-4" aria-label="د جنراتور د ډیزلو د موجودۍ ماډل">
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="text-lg font-extrabold">تایید شوې تاریخي مبدا (فزیکي شمېرنه)</h2>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">تایید شوی</span></div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["نېټه", `${GENERATOR_BASELINE.jalali}`, `میلادي ${GENERATOR_BASELINE.gregorian}`], ["فزیکي موجودي", `${fmt(GENERATOR_BASELINE.liters)} لیتره`, "په هغه ورځ"], ["د ساعت شمېرونکی", `${fmt(GENERATOR_BASELINE.meterHours)} ساعته`, "مبدا"], ["مصرف کچه", `${fmt(GENERATOR_BASELINE.rateLph)} لیتر/ساعت`, "لومړنۍ کچه"]] as const).map(([l, v, s]) =>
          <div key={l} className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-lg font-black tabular-nums">{v}</p><p className="text-xs text-muted-foreground">{s}</p></div>)}
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">دا د یوې ټاکلې ورځې تاریخي فزیکي شمېرنه ده، اوسنۍ موجودي نه ده. د لاسي دفتر موجودي او د Google Sheet تاریخي ثبتونه له دې ماډل سره نه یوځای کېږي.</p>
    </div>

    <div className="dashboard-panel space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><h2 className="text-lg font-extrabold">اټکل شوې موجودي (ماډل)</h2>
        <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs font-bold">اټکل — تایید شوی نه دی</span></div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className={"h-4 w-4 " + (q.isFetching ? "animate-spin" : "")} />تازه</Button></div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">رااخیستل کېږي…</p> : q.error ? <p role="alert" className="text-sm text-destructive">د جنراتور ثبتونه ونه لوستل شول.</p> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">اټکل شوې موجودي</p><p className="mt-1 text-2xl font-black tabular-nums">{model.estimatedBalance === null ? "نامعلومه" : `≈ ${fmt(model.estimatedBalance)} L`}</p><p className="text-xs text-muted-foreground">{model.lastReadingAt ? `تر ${isoToKabulJalali(model.lastReadingAt)} پورې` : "لوستنه نشته"}</p></div>
          <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">له مبدا وروسته ساعتونه</p><p className="mt-1 text-xl font-black tabular-nums">{fmt(model.totalHours)}</p><p className="text-xs text-muted-foreground">وروستی شمېرونکی: {fmt(lastHours)}</p></div>
          <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">اټکل شوی مصرف</p><p className="mt-1 text-xl font-black tabular-nums">{fmt(model.totalModeled)} L</p><p className="text-xs text-muted-foreground">Δساعت × د هرې دورې کچه</p></div>
          <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">تایید شوي راوړل (له مبدا وروسته)</p><p className="mt-1 text-xl font-black tabular-nums">{fmt(model.totalDelivered)} L</p><p className="text-xs text-muted-foreground">یوازې جلا تایید شوي</p></div>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">فورمول: ۴۹۷ + تایید شوي راوړل − Σ(د ساعت توپیر × د هماغې دورې لیتر/ساعت). دا یو ماډل دی؛ یوازې فزیکي اندازه‌ګیري اصلي موجودي ښيي.</p>
        {model.lastMeasured && <div className={"rounded-xl border p-3 text-sm " + (Math.abs(model.lastMeasured.discrepancy ?? 0) > 20 ? "border-destructive/50 bg-destructive/5" : "")}>
          وروستۍ فزیکي اندازه ({isoToKabulJalali(model.lastMeasured.reading_at)}): <strong>{fmt(model.lastMeasured.measured_liters ?? 0)} L</strong> · اټکل: <strong>{fmt(model.lastMeasured.estimatedBalance)} L</strong> · توپیر (فزیکي − اټکل): <strong className="tabular-nums">{(model.lastMeasured.discrepancy ?? 0) > 0 ? "+" : ""}{fmt(model.lastMeasured.discrepancy ?? 0)} L</strong></div>}
      </>}
      {gaps.length > 0 && <div role="status" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
        <p className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />نیمګړي شواهد</p>
        <ul className="list-disc space-y-1 pe-1 ps-5 text-xs leading-6">{gaps.map(g => <li key={g}>{g}</li>)}</ul></div>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={submitReading} className="dashboard-panel space-y-3 p-4 sm:p-5" aria-label="د ساعت شمېرونکي نوې لوستنه">
        <h3 className="flex items-center gap-2 font-extrabold"><Gauge className="h-4 w-4" />د ساعت شمېرونکي لوستنه</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">نېټه (هجري لمریز)<Input required dir="ltr" inputMode="numeric" value={rDate} onChange={e => setRDate(e.target.value)} placeholder="1405/07/01" /></label>
          <label className="text-sm">وخت (کابل)<Input required dir="ltr" type="time" value={rTime} onChange={e => setRTime(e.target.value)} /></label>
          <label className="text-sm">ټول ساعتونه (شمېرونکی)<Input required dir="ltr" type="number" min={Math.max(5113, lastHours)} step="0.1" value={meter} onChange={e => setMeter(e.target.value)} placeholder={`≥ ${lastHours}`} /></label>
          <label className="text-sm">لیتر/ساعت<Input dir="ltr" type="number" min="0.1" max="100" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder={String(lastRate)} /></label>
        </div>
        <label className="block text-sm">فزیکي اندازه شوي لیتره (اختیاري)<Input dir="ltr" type="number" min="0" step="0.1" value={measured} onChange={e => setMeasured(e.target.value)} placeholder="یوازې که ټانک اندازه شوی وي" /></label>
        <label className="block text-sm">یادښت<Textarea maxLength={2000} value={rNote} onChange={e => setRNote(e.target.value)} placeholder="څوک یې لوستلی، د اندازې طریقه…" /></label>
        <p className="text-xs text-muted-foreground">کچه د هغې دورې لپاره ده چې په دې لوستنه پای ته رسېږي. خالي پرېښودل = وروستۍ کچه ({fmt(lastRate)}).</p>
        {rErr && <p role="alert" className="text-sm text-destructive">{rErr}</p>}
        <Button type="submit" className="w-full" disabled={readingM.isPending}>{readingM.isPending ? "ثبتېږي…" : "لوستنه ثبت کړئ"}</Button>
      </form>
      <form onSubmit={submitDelivery} className="dashboard-panel space-y-3 p-4 sm:p-5" aria-label="تایید شوی راوړل شوی ډیزل">
        <h3 className="flex items-center gap-2 font-extrabold"><PackagePlus className="h-4 w-4" />تایید شوی راوړل شوی ډیزل</h3>
        <p className="text-xs leading-6 text-muted-foreground">یوازې هغه ډیزل چې له ۱۴۰۵/۰۶/۳۱ وروسته راغلی او تسلیمي یې په سند جلا تایید شوې. د Sheet یا لاسي دفتر ثبتونه دلته بیا مه ولیکئ مګر دا چې تایید شوي وي.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">نېټه (هجري لمریز)<Input required dir="ltr" value={dDate} onChange={e => setDDate(e.target.value)} placeholder="1405/07/01" /></label>
          <label className="text-sm">وخت (کابل)<Input required dir="ltr" type="time" value={dTime} onChange={e => setDTime(e.target.value)} /></label>
          <label className="text-sm">لیتره<Input required dir="ltr" type="number" min="0.1" step="0.1" value={dLiters} onChange={e => setDLiters(e.target.value)} /></label>
          <label className="text-sm">د رسید/سند شمېره *<Input required maxLength={120} value={dRef} onChange={e => setDRef(e.target.value)} /></label>
        </div>
        <label className="block text-sm">عرضه کوونکی / تسلیموونکی<Input maxLength={180} value={dSupplier} onChange={e => setDSupplier(e.target.value)} /></label>
        <label className="block text-sm">یادښت<Textarea maxLength={2000} value={dNote} onChange={e => setDNote(e.target.value)} placeholder="څوک یې تایید کړ…" /></label>
        {dErr && <p role="alert" className="text-sm text-destructive">{dErr}</p>}
        <Button type="submit" className="w-full" variant="outline" disabled={deliveryM.isPending}>{deliveryM.isPending ? "ثبتېږي…" : "تایید شوی راوړل ثبت کړئ"}</Button>
      </form>
    </div>

    <div className="dashboard-panel space-y-3 p-4 sm:p-5">
      <h3 className="font-extrabold">د لوستنو او دورو تاریخچه</h3>
      {model.rows.length === 0 ? <p className="rounded-lg bg-muted/40 p-6 text-center text-sm text-muted-foreground">تر اوسه لوستنه نشته. لومړۍ لوستنه له {fmt(GENERATOR_BASELINE.meterHours)} ساعتونو سره پرتله کېږي.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 text-start">نېټه / وخت</th><th className="text-start">شمېرونکی</th><th className="text-start">Δساعت</th><th className="text-start">کچه</th><th className="text-start">اټکل شوی مصرف</th><th className="text-start">راوړل</th><th className="text-start">اټکل شوې موجودي</th><th className="text-start">فزیکي</th><th className="text-start">توپیر</th><th className="text-start">یادښت</th></tr></thead>
          <tbody>
            <tr className="border-b bg-primary/5"><td className="py-2">{GENERATOR_BASELINE.jalali}</td><td>{fmt(GENERATOR_BASELINE.meterHours)}</td><td>—</td><td>{fmt(GENERATOR_BASELINE.rateLph)}</td><td>—</td><td>—</td><td className="font-bold">{fmt(GENERATOR_BASELINE.liters)}</td><td className="font-bold"><BadgeCheck className="inline h-4 w-4 text-primary" /> {fmt(GENERATOR_BASELINE.liters)}</td><td>مبدا</td><td className="text-xs">تایید شوې فزیکي شمېرنه</td></tr>
            {[...model.rows].reverse().map(r => <tr key={r.id} className="border-b border-border/50 align-top">
              <td className="py-2 whitespace-nowrap" dir="ltr">{isoToKabulJalali(r.reading_at)}</td><td>{fmt(r.meter_hours)}</td><td>{fmt(r.deltaHours)}</td><td>{fmt(r.rate_lph)}</td>
              <td>{fmt(r.modeledLiters)}</td><td>{r.deliveredInInterval ? "+" + fmt(r.deliveredInInterval) : "—"}</td><td className="font-bold">≈ {fmt(r.estimatedBalance)}</td>
              <td>{r.measured_liters == null ? <span className="text-xs text-muted-foreground">نه دی اندازه شوی</span> : fmt(r.measured_liters)}</td>
              <td className={r.discrepancy != null && Math.abs(r.discrepancy) > 20 ? "font-bold text-destructive" : ""}>{r.discrepancy == null ? "—" : (r.discrepancy > 0 ? "+" : "") + fmt(r.discrepancy)}</td>
              <td className="max-w-48 break-words text-xs">{r.note || "—"}</td></tr>)}
          </tbody></table></div>}
      {deliveries.length > 0 && <div className="overflow-x-auto"><h4 className="mb-2 mt-2 text-sm font-bold">تایید شوي راوړل</h4><table className="w-full min-w-[560px] border-collapse text-sm">
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 text-start">نېټه / وخت</th><th className="text-start">لیتره</th><th className="text-start">سند</th><th className="text-start">عرضه کوونکی</th><th className="text-start">یادښت</th></tr></thead>
        <tbody>{[...deliveries].reverse().map(d => <tr key={d.id} className="border-b border-border/50"><td className="py-2" dir="ltr">{isoToKabulJalali(d.delivered_at)}</td><td className="font-bold">{fmt(d.liters)}</td><td>{d.reference_no}</td><td>{d.supplier || "—"}</td><td className="text-xs">{d.note || "—"}</td></tr>)}</tbody></table></div>}
      {sheetUncounted.length > 0 && <div className="rounded-xl border border-dashed p-3 text-xs leading-6">
        <p className="font-bold">د Google Sheet ثبتونه چې نه دي شمېرل شوي (جلا تایید ته اړتیا):</p>
        <ul className="list-disc ps-5">{sheetUncounted.map(d => <li key={d.code + "-" + d.sequence}>{(() => { const j = sheetDate(d); return j ? formatJ(j) : "بې‌نېټې"; })()} — {fmt(d.liters)} لیتره{d.liters === 510 ? " (متنازع)" : ""}{d.document ? " — " + d.document : ""}</li>)}</ul></div>}
      <p className="text-xs text-muted-foreground">ټول ثبتونه د پلټنې لپاره نه بدلېدونکي او نه حذف کېدونکي دي. نېټې په میلادي (UTC) ساتل کېږي او په هجري لمریز ښودل کېږي.</p>
    </div>
  </section>;
}
