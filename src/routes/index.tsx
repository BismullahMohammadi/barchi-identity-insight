import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { RotatingTazkira } from "@/components/DashboardArtwork";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "د ۱۴۰۵ کال د دشت برچي الکترونیکي تذکرو مرکز ډشبورډ" },
      { name: "description", content: "د دشت برچي الکترونیکي تذکرو مرکز د ۱۴۰۵ هجري شمسي  کال د راپورونو ډشبورډ" },
      { property: "og:title", content: "د دشت برچي eNID ډشبورډ ۱۴۰۵" },
      { property: "og:description", content: "د دشت برچي مرکز راپورونه." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

let launchFinished = false;

function Landing() {
  const [launchPending, setLaunchPending] = useState(() => !launchFinished);
  const [iosStandalone, setIosStandalone] = useState(false);
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIosStandalone((navigator as Navigator & {standalone?: boolean}).standalone === true);
    const finishLaunch = () => {
      if (!mounted) return;
      launchFinished = true;
      setLaunchPending(false);
    };
    const deadline = window.setTimeout(finishLaunch, 8000);
    supabase.auth.getUser().then(({data,error}) => {
      if (!mounted) return;
      if (error && !isAuthSessionMissingError(error)) setLoginError("د حساب د تایید خدمت ته اړیکه ونه شوه. خپل انټرنېټ وګورئ او بیا هڅه وکړئ.");
      else setSignedIn(!!data.user);
    }).catch(() => { if (mounted) setLoginError("د حساب د تایید اتصال ناکام شو. بیا هڅه وکړئ."); }).finally(() => { window.clearTimeout(deadline); finishLaunch(); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (!mounted) return;
      if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="TOKEN_REFRESHED"){
        setSignedIn(!!session?.user);
        if(session?.user) setLoginError(null);
      }
    });
    return () => { mounted=false; window.clearTimeout(deadline); subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    setLoginError(null);
    setBusy(true);
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        setLoginError("په ګوګل حساب لاګېن کېدل ناکام شول. خپل حساب وګورئ او بیا هڅه وکړئ.");
        return;
      }
      if (result.redirected) return;
      const {data,error}=await supabase.auth.getUser();
      if(error||!data.user) {
        setLoginError("حساب تایید شو، خو براوزر د ننوتلو معلومات خوندي نه کړل. په براوزر کې کوکیو ته اجازه ورکړئ او بیا هڅه وکړئ.");
        return;
      }
      setSignedIn(true);
      navigate({to:"/dashboard"});
    } catch {
      setLoginError("لاګېن ناکام شوو. انټرنټ وګورئ او بیا هڅه وکړئ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {launchPending && <div className="home-launch" data-ios-standalone={iosStandalone} role="status" dir="rtl">
        <div className="home-launch-mark"><img src="/favicon.svg" width="72" height="72" alt="" /></div>
        <span>سیستم پرانیستل کېږي…</span>
      </div>}
      <main dir="rtl" className="relative isolate min-h-dvh overflow-hidden bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 start-[-8rem] size-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 end-[-10rem] size-[32rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100dvh-3.5rem)]">
          <header className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                <img src="/favicon.svg" width="36" height="36" alt="" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold sm:text-base">د دشت برچي مرکز</p>
                <p className="text-xs text-muted-foreground">د الکترونیکي تذکرو خدمتونه</p>
              </div>
            </div>
            <span className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-2 text-xs font-semibold text-muted-foreground sm:inline-flex">
              د ۱۴۰۵ هـ ش راپورونه
            </span>
          </header>

          <div className="my-auto grid flex-1 items-center py-7 sm:py-10 lg:py-12">
            <section aria-label="خوندي ننوتل" className="grid w-full overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-card lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
                <div className="mb-8 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                    <LockKeyhole className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">خوندي ننوتل</p>
                    <p className="text-xs text-muted-foreground">یوازې د مجاز کارکوونکو لپاره</p>
                  </div>
                </div>

                <h1 className="max-w-xl text-3xl font-extrabold leading-[1.55] tracking-tight sm:text-4xl">
                  {signedIn ? "تاسو په بریالیتوب ننوتلي یاست" : "د خپل مجاز حساب له لارې سیستم ته ننوځئ"}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                  {signedIn
                    ? "د مرکز راپورونو ته د تګ لپاره ډشبورډ پرانیزئ."
                    : "د دشت برچي د الکترونیکي تذکرو مرکز د راپورونو او کاري معلوماتو خوندي لاسرسی."}
                </p>

                <div className="my-7 h-px w-full bg-border/80" />

                {loginError && (
                  <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                    {loginError}
                  </p>
                )}

                {signedIn ? (
                  <Button asChild size="lg" className="w-full justify-between px-5">
                    <Link to="/dashboard">
                      <span>ډشبورډ پرانیزئ</span>
                      <ArrowLeft className="size-5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" className="w-full justify-between px-5" onClick={signIn} disabled={busy}>
                    <span>{busy ? "ننوتل روان دي…" : "په Google حساب ننوتل"}</span>
                    {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowLeft className="size-5" aria-hidden="true" />}
                  </Button>
                )}

                <div className="mt-5 flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p>ستاسو رمز دلته نه لیکل کېږي؛ د ننوتلو تایید د Google له لارې ترسره کېږي.</p>
                </div>
              </div>

              <aside className="relative isolate flex min-h-[340px] flex-col justify-between overflow-hidden bg-primary p-7 text-primary-foreground sm:min-h-[390px] sm:p-10 lg:min-h-[560px] lg:p-12">
                <div aria-hidden="true" className="pattern-dots pointer-events-none absolute inset-0 opacity-60" />
                <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-20 size-72 rounded-full border border-white/10" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -start-24 size-80 rounded-full border border-white/10" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    د مرکز رسمي ډشبورډ
                  </span>

                  <div className="relative mx-auto my-9 flex w-full max-w-sm flex-col items-center">
                    <div aria-hidden="true" className="relative grid min-h-56 w-full place-items-center">
                      <span className="absolute size-48 rounded-full border border-dashed border-white/15 sm:size-56" />
                      <RotatingTazkira animate={false} className="relative z-10 w-64 drop-shadow-2xl sm:w-72" />
                    </div>
                    <p className="mt-2 text-xs text-primary-foreground">د تذکرې د ډیزاین نمونه</p>
                  </div>

                  <h2 className="text-2xl font-bold leading-relaxed sm:text-3xl">د خدمت لپاره، د باور پر بنسټ</h2>
                  <p className="mt-2 max-w-md text-sm leading-7 text-primary-foreground">
                    مهم راپورونه او د مرکز کاري معلومات په روښانه، منظم او د لاسرسي له اجازو سره سم وګورئ.
                  </p>
                </div>

                <div className="relative mt-8 border-t border-white/15 pt-5">
                  <p className="text-xs leading-6 text-primary-foreground">د دشت برچي د الکترونیکي تذکرو مرکز</p>
                  <p className="text-sm font-semibold">۱۴۰۵ هـ ش</p>
                </div>
              </aside>
            </section>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs text-muted-foreground">
            <span>د مرکز داخلي راپورونو ته خوندي لاسرسی</span>
            <span>© ۱۴۰۵ د دشت برچي مرکز</span>
          </footer>
        </div>
      </main>
    </>
  );
}
