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
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-background px-4 py-6 text-foreground sm:py-12">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-card md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6 p-6 sm:p-10 md:justify-center md:py-14">
          <div className="flex items-center gap-3 text-sm font-bold text-primary">
            <img src="/favicon.svg" width="44" height="44" alt="" />
            <span>تحلیلي ډشبورډ · ۱۴۰۵ هـ ش</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-relaxed sm:text-4xl">د دشت برچي د الکترونیکي تذکرو مرکز</h1>
          <div className="space-y-4 border-t pt-5">
            {!signedIn && <p className="text-sm leading-7 text-muted-foreground">د راپورونو د کتلو لپاره په خپل مجاز ګوګل حساب ننوځئ.</p>}
            {loginError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{loginError}</p>}
            {signedIn ? (
              <Button asChild size="lg" className="w-full"><Link to="/dashboard">ډشبورډ پرانیزئ</Link></Button>
            ) : (
              <Button size="lg" className="w-full" onClick={signIn} disabled={busy}>
                {busy ? "ننوتل روان دي…" : "په ګوګل حساب ننوځئ"}
              </Button>
            )}
          </div>
        </div>
        <div className="relative isolate grid place-items-center overflow-hidden bg-[#174f54] p-4 sm:p-7 md:p-8">
          <div className="w-full max-w-72 overflow-hidden rounded-t-[8rem] rounded-b-2xl bg-[#e2efea] p-2 shadow-lg">
            <LoginChair />
          </div>
          <RotatingTazkira className="absolute bottom-4 start-5 w-16 sm:start-8 md:bottom-12 md:w-24" />
        </div>
      </section>
    </main>
    </>
  );
}
