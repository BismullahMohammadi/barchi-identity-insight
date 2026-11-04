import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, LineChart, Lock, Fingerprint } from "lucide-react";
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
    <main dir="rtl" className="grid h-[100dvh] w-full grid-cols-1 overflow-hidden bg-[#f8fbff] text-[#122448] lg:grid-cols-[45%_55%]">
      <section className="relative order-2 flex min-h-0 items-center justify-center overflow-hidden px-5 py-4 sm:px-10 lg:order-1 lg:px-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-[clamp(12px,3vh,30px)] flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#0758ad] text-white shadow-lg shadow-blue-900/15"><Fingerprint className="size-7" /></span>
            <div><p dir="ltr" className="text-left text-[clamp(17px,2vw,23px)] font-extrabold tracking-tight text-[#0b2857]">Barchi Identity Insight</p><p className="text-xs text-slate-500">د دشت برچي د الکترونیکي تذکرو مرکز</p></div>
          </div>
          <div className="mb-[clamp(12px,3vh,28px)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Lock className="size-3.5" /> خصوصي او خوندي سیستم</span>
            <h1 className="mt-3 text-[clamp(22px,3.5vh,36px)] font-extrabold leading-[1.45] text-[#102d5b]">خپل حساب ته ننوزئ</h1>
            <p className="mt-1 text-[clamp(12px,1.7vh,15px)] leading-6 text-slate-500">د مرکز د راپورونو او مدیریتي معلوماتو لپاره د خپل مجاز Google حساب له لارې ننوزئ.</p>
          </div>
          <div className="rounded-[24px] border border-[#e0e9f6] bg-white p-[clamp(16px,3vh,30px)] shadow-[0_16px_55px_-25px_rgba(10,47,105,.30)]">
            <div className="mb-4 flex items-center gap-2 text-[clamp(15px,2.1vh,19px)] font-bold text-[#102d5b]"><ShieldCheck className="size-5 text-[#0864bd]" /> خوندي ننوتل</div>
            {loginError && <div role="alert" className="mb-3 max-h-[18vh] overflow-auto rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{loginError}</div>}
            {signedIn ? (
              <Button asChild size="lg" className="h-12 w-full rounded-xl bg-[#0758ad] text-white hover:bg-[#06478c]"><Link to="/dashboard">ډشبورډ ته لاړ شئ</Link></Button>
            ) : (
              <Button size="lg" onClick={signIn} disabled={busy} className="h-12 w-full rounded-xl bg-[#0758ad] text-white hover:bg-[#06478c]">{busy ? "د ننوتلو هڅه روانه ده…" : "د ګوګل له لارې ننوتل"}</Button>
            )}
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">یوازې اجازه لرونکي حسابونه سیستم ته لاسرسی لري.</p>
          </div>
          <div className="mt-[clamp(10px,2.5vh,24px)] grid grid-cols-3 gap-2 text-center text-[11px] text-[#31527b]">
            <span className="rounded-xl bg-[#edf4fc] px-2 py-2"><ShieldCheck className="mx-auto mb-1 size-4" /> خوندي لاسرسی</span>
            <span className="rounded-xl bg-[#edf4fc] px-2 py-2"><Lock className="mx-auto mb-1 size-4" /> یوازې لوستل</span>
            <span className="rounded-xl bg-[#edf4fc] px-2 py-2"><LineChart className="mx-auto mb-1 size-4" /> تازه راپورونه</span>
          </div>
        </div>
      </section>
      <section aria-hidden="true" className="relative order-1 h-[min(24dvh,180px)] min-h-0 overflow-hidden bg-[#15365d] lg:order-2 lg:h-full">
        <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85" alt="" className="absolute inset-0 h-full w-full object-cover object-center lg:object-[45%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061c44]/55 via-[#0a3264]/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-[#0758ad]/80 to-transparent lg:block" />
        <div className="absolute bottom-7 left-8 right-8 hidden text-white drop-shadow-lg lg:block"><p dir="ltr" className="text-left text-2xl font-bold">Barchi Identity Insight</p><p className="mt-2 text-sm">د دشت برچي د الکترونیکي تذکرو مرکز مدیریتي سیستم</p></div>
      </section>
    </main>
  );
}
