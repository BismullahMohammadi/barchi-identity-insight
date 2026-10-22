import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, ShieldCheck, Settings2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardSettings, saveDashboardSettings, resetDashboardSettings, type DashboardSettings } from "@/lib/dashboard-settings";
import { accessQuery } from "@/lib/queries";

export function DashboardSettingsPage() {
  const settings = useDashboardSettings();
  const access = useQuery(accessQuery);
  const queryClient = useQueryClient();
  function update<K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) {
    saveDashboardSettings({ ...settings, [key]: value });
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Settings2 className="h-6 w-6" />تنظیمات</h1>
        <p className="text-sm text-muted-foreground">د ښودلو او تازه کېدو ساده تنظیمات.</p>
      </div>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-bold"><RefreshCw className="h-4 w-4" />د معلوماتو تازه کول</h2>
        <label htmlFor="refresh-rate" className="block text-sm">د اتومات تازه کېدو موده</label>
        <Select value={String(settings.refreshSeconds)} onValueChange={(value) => update("refreshSeconds", Number(value) as DashboardSettings["refreshSeconds"])}>
          <SelectTrigger id="refresh-rate" className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">هر ۳۰ ثانیې</SelectItem>
            <SelectItem value="60">هره ۱ دقیقه (اصلي)</SelectItem>
            <SelectItem value="120">هرې ۲ دقیقې</SelectItem>
            <SelectItem value="300">هرې ۵ دقیقې</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["sheet"] }).then(() => Promise.all([queryClient.invalidateQueries({queryKey:["daily-forms"]}),queryClient.invalidateQueries({queryKey:["daily-coordination"]})]))}>
          <RefreshCw className="h-4 w-4" /> اوس معلومات تازه کړئ
        </Button>
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-bold"><Monitor className="h-4 w-4" />د ښودلو تنظیمات</h2>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">زما دندې (To-Do)</p><p className="text-xs text-muted-foreground">د عمومي کتنې په سر کې یې ښکاره کړئ</p></div>
          <Switch checked={settings.showTodo} onCheckedChange={v=>update("showTodo",v)} aria-label="زما دندې فعالې کړئ"/>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">د پرون مدیریتي مشوره</p><p className="text-xs text-muted-foreground">له موجود راپور څخه اتومات تحلیل</p></div>
          <Switch checked={settings.showAdvice} onCheckedChange={v=>update("showAdvice",v)} aria-label="د پرون مشوره فعاله کړئ"/>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">ورځني مراجعین</p><p className="text-xs text-muted-foreground">د نوي معرفي شويو او ثبت نام ته معرفي شويو ګډ کارت</p></div>
          <Switch checked={settings.showDailyVisitors} onCheckedChange={(v) => update("showDailyVisitors",v)} aria-label="ورځني مراجعین ښکاره کړئ" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">لنډ کارتونه</p><p className="text-xs text-muted-foreground">په عمومي کتنه کې لږ ځای نیسي</p></div>
          <Switch checked={settings.compactCards} onCheckedChange={(v) => update("compactCards",v)} aria-label="لنډ کارتونه فعال کړئ" />
        </div>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />حساب او امنیت</h2>
        <p className="text-sm">ننوتلی حساب: <strong dir="ltr">{access.data?.email ?? "—"}</strong></p>
        <p className="text-sm">د مالک اجازه: <strong>{access.data?.allowed ? "فعاله" : "تایید نه ده"}</strong></p>
        <p className="text-xs text-muted-foreground">د مالک ایمیل، Google Sheets د اتصال کلۍ او د لاسرسي اجازې یوازې په سرور کې تنظیمېږي؛ له دې پاڼې نه بدلېږي.</p>
      </section>
      <Button variant="outline" onClick={resetDashboardSettings}><RotateCcw className="h-4 w-4" /> اصلي تنظیمات بېرته راوګرځوئ</Button>
    </div>
  );
}
