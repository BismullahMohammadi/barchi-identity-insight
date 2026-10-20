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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  async function signIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      toast.error("ننوتل ناکام شول، بیا هڅه وکړئ.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-hero text-primary-foreground">
      <div className="absolute inset-0 pattern-dots" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1 text-xs font-semibold text-sidebar-primary">
          <Lock className="h-3.5 w-3.5" /> خصوصي — یوازې مالک
        </span>
        <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
          د دشت برچي eNID مرکز
          <span className="block text-sidebar-primary">تحلیلي ډشبورډ ۱۴۰۵</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg opacity-85">
          د تثبت هویت، عوایدو، کنټرول، خدماتو او توزیع ژوندي شمېرې — مستقیم د راپور شیټ څخه، یوازې د لوستلو لپاره.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild variant="hero" size="lg"><Link to="/dashboard">ډشبورډ ته لاړ شئ</Link></Button>
          ) : (
            <Button variant="hero" size="lg" onClick={signIn} disabled={busy}>
              د ګوګل له لارې ننوتل
            </Button>
          )}
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "یوازې اجازه لرونکي", d: "یوازې د مالک ایمیل لاسرسی لري؛ نور ټول رد کېږي." },
            { icon: Lock, t: "یوازې لوستل", d: "اصلي شیټ هیڅکله نه بدلېږي." },
            { icon: LineChart, t: "هره دقیقه تازه", d: "شمېرې هر ۶۰ ثانیې بیا لوستل کېږي." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-5 backdrop-blur">
              <Icon className="h-5 w-5 text-sidebar-primary" />
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm opacity-80">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
