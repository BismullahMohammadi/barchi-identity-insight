import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, LineChart, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "د دشت برچي eNID ډشبورډ ۱۴۰۵ — خصوصي ننوتل" },
      { name: "description", content: "د دشت برچي د الکترونیکي تذکرو مرکز خصوصي تحلیلي ډشبورډ — یوازې د مالک لپاره." },
      { property: "og:title", content: "د دشت برچي eNID ډشبورډ ۱۴۰۵" },
      { property: "og:description", content: "خصوصي تحلیلي ډشبورډ، یوازې د اجازه لرونکي مالک لپاره." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({data,error}) => {
      if (!mounted) return;
      if (error) setLoginError("د حساب د تایید خدمت ته اړیکه ونه شوه. د انټرنټ یا Supabase اتصال وګورئ.");
      else setSignedIn(!!data.user);
    }).catch(() => { if (mounted) setLoginError("د حساب د تایید اتصال ناکام شو. بیا هڅه وکړئ."); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (!mounted) return;
      if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="TOKEN_REFRESHED"){
        setSignedIn(!!session?.user);
        if(session?.user) setLoginError(null);
      }
    });
    return () => { mounted=false; subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    setLoginError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        setLoginError("د Google ننوتل ناکام شول. د Google حساب، د OAuth اجازه او د سیستم اتصال وګورئ.");
        toast.error("ننوتل ناکام شول؛ د خطا تفصیل په پاڼه کې وګورئ.");
        return;
      }
      if (result.redirected) return;
      const {data,error}=await supabase.auth.getUser();
      if(error||!data.user) {
        setLoginError("Google حساب تایید شو، خو خوندي Session ونه ساتل شو. د براوزر Cookies/Storage او Supabase تنظیمات وګورئ.");
        return;
      }
      setSignedIn(true);
      navigate({to:"/dashboard"});
    } catch {
      setLoginError("د ننوتلو خدمت ته اړیکه ونه شوه. انټرنټ وګورئ او بیا هڅه وکړئ.");
      toast.error("د ننوتلو اتصال ناکام شو.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef9f6] text-[#123e46]">
      <div className="pointer-events-none absolute inset-0 opacity-25 pattern-dots" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#a6d9d0] bg-white/85 px-3 py-1 text-xs font-semibold text-[#0b6b74]">
          <Lock className="h-3.5 w-3.5" /> خصوصي — یوازې مالک
        </span>
        <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
          د دشت برچي eNID مرکز
          <span className="block text-[#0b6b74]">تحلیلي ډشبورډ ۱۴۰۵</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg opacity-85">
          د تثبت هویت، عوایدو، کنټرول، خدماتو او توزیع ژوندي شمېرې — مستقیم د راپور شیټ څخه، یوازې د لوستلو لپاره.
        </p>
        {loginError && <div role="alert" className="mt-6 max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">{loginError}</div>}
        <div className="mt-10 flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild variant="hero" size="lg"><Link to="/dashboard">ډشبورډ ته لاړ شئ</Link></Button>
          ) : (
            <Button variant="hero" size="lg" onClick={signIn} disabled={busy}>
              {busy ? "د ننوتلو هڅه روانه ده…" : "د ګوګل له لارې ننوتل"}
            </Button>
          )}
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "یوازې اجازه لرونکي", d: "یوازې د مالک ایمیل لاسرسی لري؛ نور ټول رد کېږي." },
            { icon: Lock, t: "یوازې لوستل", d: "اصلي شیټ هیڅکله نه بدلېږي." },
            { icon: LineChart, t: "هره دقیقه تازه", d: "شمېرې هر ۶۰ ثانیې بیا لوستل کېږي." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-3xl border border-[#c9e7e0] bg-white/95 p-5 text-[#123e46] shadow-sm">
              <Icon className="h-5 w-5 text-[#0b6b74]" />
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm opacity-80">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
