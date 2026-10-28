import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersRound, UserRoundPlus, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recentReferralsQuery, errorText } from "@/lib/queries";
import { useDashboardSettings, settingsRefreshMs } from "@/lib/dashboard-settings";
import type { ReferralGroup } from "@/lib/recent-referrals";

type Section = "intake" | "registration";

function initialVisibility(section: Section): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`barchi-referrals-${section}-visible`) !== "0";
  } catch {
    return true;
  }
}

function People({ group }: { group: ReferralGroup }) {
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        د راپور نېټه: {group.date ?? "نه ده موندل شوې"}
      </p>
      {!group.people.length ? (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          تر اوسه د مراجعینو معلومات نشته.
        </p>
      ) : (
        <ol className="space-y-2">
          {group.people.slice(0, 5).map((person, index) => (
            <li key={index} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="break-words text-sm font-bold text-foreground">{person.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                د پلار نوم: <span className="text-foreground">{person.father}</span>
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                د کورنۍ غړي: <span className="font-semibold text-foreground">{person.familyMembers ?? "—"}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReferralCard({
  section,
  title,
  group,
  loading,
  error,
}: {
  section: Section;
  title: string;
  group?: ReferralGroup;
  loading: boolean;
  error: Error | null;
}) {
  const [visible, setVisible] = useState(() => initialVisibility(section));
  const Icon = section === "intake" ? UserRoundPlus : UsersRound;
  const contentId = `recent-referrals-${section}`;

  function toggle() {
    setVisible((wasVisible) => {
      const next = !wasVisible;
      try {
        window.localStorage.setItem(`barchi-referrals-${section}-visible`, next ? "1" : "0");
      } catch {
        // Storage is optional.
      }
      return next;
    });
  }

  return (
    <section className="dashboard-panel min-w-0 w-full overflow-hidden p-4 sm:p-5" aria-label={title}>
      <div className="flex min-h-10 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-extrabold leading-6">
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          {title}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggle}
          aria-label={visible ? `${title} پټ کړئ` : `${title} ښکاره کړئ`}
          aria-expanded={visible}
          aria-controls={contentId}
          className="shrink-0 gap-1"
        >
          {visible ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
          {visible ? "پټول" : "ښکاره کول"}
        </Button>
      </div>
      {visible && (
        <div id={contentId} className="mt-4 border-t border-border/60 pt-4">
          {loading ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
              معلومات رااخیستل کېږي…
            </p>
          ) : error ? (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {errorText(error)}
            </p>
          ) : group ? (
            <People group={group} />
          ) : (
            <p className="text-sm text-muted-foreground">معلومات نشته.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Both private lists are visible together by default and can collapse independently. */
export function RecentReferralsCard() {
  const settings = useDashboardSettings();
  const q = useQuery(recentReferralsQuery(settingsRefreshMs(settings)));
  return (
    <section aria-label="وروستي معرفي شوي مراجعین" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          <UsersRound aria-hidden="true" className="h-5 w-5 text-primary" />
          وروستي معرفي شوي مراجعین
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          aria-label="د مراجعینو لېستونه تازه کړئ"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          تازه کول
        </Button>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:gap-4">
        <ReferralCard
          section="intake"
          title="وروستي ۵ نوي معرفي شوي مراجعین"
          group={q.data?.newReferrals}
          loading={q.isLoading}
          error={q.error}
        />
        <ReferralCard
          section="registration"
          title="وروستي ۵ ثبت‌نام ته معرفي شوي مراجعین"
          group={q.data?.registration}
          loading={q.isLoading}
          error={q.error}
        />
      </div>
      <p className="text-xs text-muted-foreground">تر پنځو وروستیو ثبتونو · یوازې د مدیر لپاره</p>
    </section>
  );
}
