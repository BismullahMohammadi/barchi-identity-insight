import { RotatingTazkira } from "@/components/DashboardArtwork";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { LoginChair } from "@/components/LoginChair";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-25 pattern-dots" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:px-8">
        <section className="grid gap-5 rounded-3xl border bg-card p-4 shadow-card sm:p-6 md:grid-cols-[1.2fr_1fr] md:items-stretch md:gap-8">
          <div className="md:col-start-2 md:row-start-1"><LoginChair /></div>
          <div className="self-center px-2 pb-2 md:col-start-1 md:row-start-1 md:p-5">
            <RotatingTazkira className="mb-5 w-24 sm:w-32" />
        <h1 className="font-display text-3xl font-extrabold leading-snug sm:text-5xl">
          د دشت برچي د الکترونیکي تذکرو مرکز
          <span className="mt-3 block text-xl text-primary sm:text-3xl">تحلیلي ډشبورډ ۱۴۰۵ هـ ش</span>
        </h1>
        {!signedIn && <p className="mt-6 max-w-xl text-lg">د راپورونو د کتلو لپاره په خپل مجاز ګوګل حساب ننوځئ.</p>}
        {loginError && <div role="alert" className="mt-6 max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">{loginError}</div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild variant="default" size="lg"><Link to="/dashboard">ډشبورډ پرانیزئ</Link></Button>
          ) : (
            <Button variant="default" size="lg" onClick={signIn} disabled={busy}>
              {busy ? "ننوتل روان دي…" : "په ګوګل حساب ننوځئ"}
            </Button>
          )}
        </div>
        </div></section>
      </div>
    </main>
    </>
  );
}
