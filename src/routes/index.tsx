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
      <main dir="rtl" className="relative isolate h-dvh overflow-hidden bg-background px-3 py-3 text-foreground sm:px-6 sm:py-4 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 start-[-8rem] size-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 end-[-10rem] size-[32rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col">
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

          <div className="flex min-h-0 flex-1 items-center py-2 sm:py-4">
            <section aria-label="خوندي ننوتل" className="login-panel grid max-h-full w-full max-w-5xl overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
              <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-12">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                    <LockKeyhole className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                      {signedIn ? "تاسو لا دمخه ننوتلي یاست" : "سیستم ته ننوتل"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {signedIn ? "ډشبورډ پرانیزئ." : "یوازې د مجاز کارکوونکو لپاره"}
                    </p>
                  </div>
                </div>

                {loginError && (
                  <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                    {loginError}
                  </p>
                )}

                {signedIn ? (
                  <Button asChild size="lg" className="login-submit w-full justify-between px-5">
                    <Link to="/dashboard">
                      <span>ډشبورډ پرانیزئ</span>
                      <ArrowLeft className="size-5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" className="login-submit w-full justify-between px-5" onClick={signIn} disabled={busy}>
                    <span>{busy ? "ننوتل روان دي…" : "په Google حساب ننوتل"}</span>
                    {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowLeft className="size-5" aria-hidden="true" />}
                  </Button>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p>د ننوتلو تایید د Google له لارې کېږي.</p>
                </div>
              </div>

              <aside className="relative isolate flex min-h-0 flex-col overflow-hidden bg-primary p-4 text-primary-foreground sm:p-7 lg:p-9">
                <div aria-hidden="true" className="pattern-dots pointer-events-none absolute inset-0 opacity-60" />
                <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-20 size-72 rounded-full border border-white/10" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -start-24 size-80 rounded-full border border-white/10" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    د مرکز ډشبورډ
                  </span>

                  <h2 className="mt-3 text-lg font-bold leading-tight sm:text-2xl">د مرکز راپورونه</h2>

                  <div className="relative mx-auto mt-2 flex w-full max-w-sm flex-col items-center sm:mt-5">
                    <div aria-hidden="true" className="relative grid h-28 w-full place-items-center sm:h-44">
                      <span className="absolute size-36 rounded-full border border-dashed border-white/15 sm:size-48" />
                      <RotatingTazkira motion="showcase" className="relative z-10 w-44 drop-shadow-2xl sm:w-56 lg:w-64" />
                    </div>
                    <p className="mt-1 hidden text-xs text-primary-foreground sm:block">د تذکرې د ډیزاین نمونه</p>
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
