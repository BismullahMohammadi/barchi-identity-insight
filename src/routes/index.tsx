import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, LineChart, Lock, Fingerprint } from "lucide-react";
const officePhoto = "https://raw.githubusercontent.com/BismullahMohammadi/barchi-identity-insight/491a5151f3c2fc1c11bc78b2335420345ac864cd/src/assets/kabul-office-login.webp";
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
    <main className="grid h-[100dvh] w-full grid-rows-[minmax(0,1fr)_minmax(0,130px)] overflow-hidden bg-card text-foreground lg:grid-rows-1 lg:grid-cols-[45fr_55fr]">
      {/* Login panel — first in DOM → right side in RTL */}
      <section className="relative z-10 flex min-h-0 flex-col justify-center overflow-hidden px-5 py-3 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-navy-foreground shadow-md">
              <Fingerprint className="h-7 w-7" aria-hidden />
            </span>
            <div dir="ltr" className="text-left">
              <p className="font-display text-lg font-extrabold leading-tight text-navy">Barchi Identity Insight</p>
              <p className="text-xs text-muted-foreground">eNID Analytics · 1405</p>
            </div>
          </div>

          <h1 className="mt-[clamp(8px,3vh,40px)] font-display text-[clamp(20px,3vh,36px)] font-extrabold leading-snug text-navy md:text-4xl">
            د دشت برچي د الکترونیکي تذکرو مرکز
            <span className="mt-1 block text-xl font-bold text-foreground md:text-2xl">تحلیلي ډشبورډ ۱۴۰۵ هـ ش</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            د اسنادو چک، تثبت هویت، عوایدو، ثبت نام، کنټرول کیفیت، خدمات پس از توزیع او توزیع ژوندي شمېرې — مستقیم د راپور شیټ څخه، یوازې د حلیل لپاره.
          </p>

          <div className="mt-[clamp(8px,2vh,32px)] rounded-3xl border border-border bg-card p-6 [box-shadow:var(--shadow-login-card)] sm:p-7">
            <div className="flex items-center gap-2 text-sm font-bold text-navy">
              <ShieldCheck className="h-5 w-5" aria-hidden /> خوندي ننوتل
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              یوازې د اجازه لرونکي مالک Google حساب لاسرسی لري؛ نور ټول حسابونه رد کېږي.
            </p>
            {loginError && <div role="alert" className="mt-4 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm leading-7 text-foreground">{loginError}</div>}
            <div className="mt-6">
              {signedIn ? (
                <Button asChild size="lg" className="h-12 w-full bg-navy text-base font-bold text-navy-foreground hover:bg-navy/90">
                  <Link to="/dashboard">ډشبورډ ته لاړ شئ</Link>
                </Button>
              ) : (
                <Button size="lg" onClick={signIn} disabled={busy} variant="outline"
                  className="h-12 w-full gap-3 border-navy/25 text-base font-bold text-navy hover:bg-navy-soft">
                  <GoogleMark />
                  {busy ? "د ننوتلو هڅه روانه ده…" : "د ګوګل له لارې ننوتل"}
                </Button>
              )}
            </div>
          </div>

          <ul className="mt-3 hidden gap-2 text-xs sm:grid text-muted-foreground sm:grid-cols-3">
            {[
              { icon: Lock, t: "یوازې مالک" },
              { icon: ShieldCheck, t: "یوازې لوستل" },
              { icon: LineChart, t: "هره دقیقه تازه" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-2 rounded-xl bg-navy-soft px-3 py-2 text-navy">
                <Icon className="h-4 w-4 shrink-0" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Photo panel — left side on desktop, top banner on mobile */}
      <section className="relative order-first h-full min-h-0 overflow-hidden lg:order-none" aria-hidden>
        <img src={officePhoto} alt="" width={1152} height={1536} fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[50%_60%] lg:object-[45%_center]" />
        <div className="absolute inset-0 [background-image:var(--gradient-login-photo)]" />
        {/* curved transition into the white panel (desktop) */}
        <svg className="absolute inset-y-0 right-0 hidden h-full w-24 lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M100 0 L60 0 C 10 30, 10 70, 60 100 L100 100 Z" fill="var(--card)" />
          <path d="M60 0 C 10 30, 10 70, 60 100" fill="none" stroke="var(--navy)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.6" />
        </svg>
        {/* curved transition (mobile, bottom edge) */}
        <svg className="absolute inset-x-0 bottom-0 h-10 w-full lg:hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 L0 60 C 30 10, 70 10, 100 60 L100 100 Z" fill="var(--card)" />
        </svg>
        <div className="absolute bottom-12 right-8 left-8 hidden text-navy-foreground lg:block lg:right-28">
          <p className="font-display text-2xl font-extrabold">Barchi Identity Insight</p>
          <p className="mt-1 text-sm opacity-90">خصوصي اداري تحلیلي سیستم — دشت برچي، کابل</p>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
