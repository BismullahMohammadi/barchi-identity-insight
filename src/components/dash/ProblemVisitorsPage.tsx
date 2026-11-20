import { useSectionActions } from "@/lib/dashboard-access-context";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  getProblemMatchDetails,
  getProblemVisitors,
  changeProblemVisitor,
} from "@/lib/problem-visitors.functions";
import { ProblemVisitorAlerts } from "@/components/dash/ProblemVisitorAlerts";

import { recentReferralsQuery } from "@/lib/queries";

export function ProblemVisitorsPage() {
  const can = useSectionActions("problem-visitors");
  const dashboard = useSectionActions("dashboard");
  const recent = useQuery({ ...recentReferralsQuery(60_000), enabled: dashboard("view") });
  const currentMatches = new Set(recent.data?.potentialMatches?.map((match) => match.visitorId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const details = useQuery({
    queryKey: ["problem-match-details", selectedId],
    queryFn: () => getProblemMatchDetails({ data: selectedId! }),
    enabled: !!selectedId && dashboard("view"),
  });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [father, setFather] = useState("");
  const [issue, setIssue] = useState("");
  const q = useQuery({
    queryKey: ["problem-visitors"],
    queryFn: () => getProblemVisitors(),
    refetchInterval: 60_000,
    retry: false,
  });
  const selected = q.data?.visitors.find((v) => v.id === selectedId);
  const mutation = useMutation({
    mutationFn: changeProblemVisitor,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["problem-visitors"] });
    },
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    await mutation.mutateAsync({
      data: { action: "add", full_name: name, father_name: father, issue },
    });
    setName("");
    setFather("");
    setIssue("");
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">د مراجعینو ثبت شوې ستونزې</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ثبتونه د مراجع د نوم او د پلار د نوم د پرتله کولو لپاره کارېږي.
        </p>
      </div>
      {dashboard("view") && <ProblemVisitorAlerts />}
      {recent.data?.matchHistorySaved === false && (
        <p role="status">د اوسني تطابق سابقه خوندي نه شوه. د ډیټابېس تنظیمات وګورئ.</p>
      )}
      {can("create") && (
        <form
          onSubmit={add}
          className="dashboard-panel grid gap-3 p-4 sm:p-5"
          aria-label="د مراجع د ستونزې ثبت"
        >
          <h2 className="font-bold">نوی مراجع ثبت کړئ</h2>
          <label className="grid gap-1 text-sm">
            نوم او تخلص
            <Input
              required
              maxLength={180}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            د پلار نوم
            <Input
              required
              maxLength={180}
              value={father}
              onChange={(e) => setFather(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            د ستونزې تفصیل
            <Textarea
              required
              minLength={3}
              maxLength={2000}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={mutation.isPending}>
            <Plus className="h-4 w-4" /> ثبتول
          </Button>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              د ثبت یا بدلون غوښتنه ناکامه شوه. د ډیټابېس تنظیمات او اجازه وګورئ.
            </p>
          )}
        </form>
      )}
      {q.data?.skipped === null && (
        <p role="status">د شیټ همغږي بشپړه نه شوه. خوندي شوي ثبتونه ښکاري.</p>
      )}
      {!!q.data?.skipped && (
        <p role="status">
          د نیمګړو یا ناسمو معلوماتو له امله {q.data.skipped} قطارونه وارد نه شول.
        </p>
      )}
      <section className="dashboard-panel p-4 sm:p-5">
        <h2 className="mb-3 font-bold">ثبت شوي مراجعین ({q.data?.visitors.length ?? 0})</h2>
        {q.isLoading ? (
          <p>معلومات رااخیستل کېږي…</p>
        ) : q.error ? (
          <p role="alert" className="text-destructive">
            لېست ونه لوستل شو. بیا هڅه وکړئ؛ که ستونزه پاتې وي، له عمومي مدیر سره اړیکه ونیسئ.
          </p>
        ) : q.data?.visitors.length === 0 ? (
          <p className="text-muted-foreground">تر اوسه مراجع نه دی ثبت شوی.</p>
        ) : (
          <div className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
            {q.data?.visitors.map((v) => {
              const flagged =
                v.status === "active" && (!!v.first_matched_at || currentMatches.has(v.id));
              return (
                <article
                  key={v.id}
                  className={`relative min-w-0 rounded-lg border px-3 py-2 ${flagged ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40" : "bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 break-words">
                      <p className="break-words font-bold">{v.full_name}</p>
                      <p className="text-sm text-muted-foreground">د پلار نوم: {v.father_name}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold">
                      {flagged ? "احتمالي تطابق" : v.status === "active" ? "فعال" : "حل شوی"}
                    </span>
                  </div>
                  {(v.first_matched_at || currentMatches.has(v.id)) && dashboard("view") ? (
                    <button
                      type="button"
                      className="py-1 text-sm font-bold underline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-primary"
                      onClick={() => setSelectedId(v.id)}
                      aria-label={v.full_name + " — د تطابق تفصیل"}
                    >
                      د تطابق تفصیل
                    </button>
                  ) : (
                    <details className="mt-1 text-sm">
                      <summary className="cursor-pointer py-1">د ستونزې تفصیل</summary>
                      <p className="whitespace-pre-wrap break-words">{v.issue}</p>
                    </details>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 [&_button]:relative">
                    {can("edit") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            data: {
                              action: "status",
                              id: v.id,
                              status: v.status === "active" ? "resolved" : "active",
                            },
                          })
                        }
                      >
                        {v.status === "active" ? "حل شوی وټاکئ" : "بیا فعال کړئ"}
                      </Button>
                    )}
                    {can("delete") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (window.confirm("دا ثبت حذف شي؟"))
                            mutation.mutate({ data: { action: "delete", id: v.id } });
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> حذف
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent side="right" dir="rtl" className="w-[95vw] overflow-y-auto sm:max-w-xl">
          <SheetTitle>{selected?.full_name}</SheetTitle>
          <SheetDescription>د پلار نوم: {selected?.father_name}</SheetDescription>
          <p className="my-3 whitespace-pre-wrap break-words text-sm">{selected?.issue}</p>
          {details.isPending ? (
            <p role="status">د تطابق معلومات رااخیستل کېږي…</p>
          ) : details.isError ? (
            <button onClick={() => details.refetch()}>معلومات ونه لوستل شول؛ بیا هڅه وکړئ</button>
          ) : !details.data.length ? (
            <p>د دې تطابق د سرچینې تفصیل تر اوسه نه دی خوندي شوی.</p>
          ) : (
            details.data.map((d, i) => (
              <section key={i} className="mb-3 rounded-lg border p-3">
                <h3 className="font-bold">
                  {d.section === "intake" ? "نوي معرفي شوي" : "ثبت‌نام ته معرفي"}
                </h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {Object.entries({
                    شیټ: d.sheet,
                    نېټه: d.date,
                    "په لېست کې نوم": d.name,
                    "د پلار نوم": d.father,
                    "د کورنۍ غړي": d.familyMembers,
                    "د دوسیې کوډ": d.fileCode,
                    ټیم: d.team,
                    "د تطابق ډول":
                      d.confidence === "normalized-exact"
                        ? "نوم او د پلار نوم برابر دي"
                        : "ورته لیکدود؛ تایید ته اړتیا لري",
                  }).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words">{value ?? "نامعلوم"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </SheetContent>
      </Sheet>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />د نوم او پلار نوم تطابق یوازې احتمالي نښه ده؛
        د هویت تر تایید مخکې پرې اداري پرېکړه مه کوئ.
      </p>
    </div>
  );
}
