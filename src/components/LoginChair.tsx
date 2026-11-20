import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function LoginChair() {
  const video = useRef<HTMLVideoElement>(null);
  const [allowMotion, setAllowMotion] = useState(false);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowMotion(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  return (
    <div className="relative isolate mx-auto flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#e2efea] sm:h-48 md:h-full md:min-h-80">
      <img src="/login-chair.webp" alt="دفتري چرخکي څوکۍ" width="380" height="420" className="h-full w-full object-contain" />
      {allowMotion && (
        <>
          <video
            ref={video}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
            poster="/login-chair.webp"
            autoPlay loop muted playsInline
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            src="/login-chair.mp4"
          />
          <button
            type="button"
            aria-label={paused ? "څوکۍ وڅرخوئ" : "څوکۍ ودروئ"}
            className="absolute bottom-2 end-2 grid size-11 place-items-center rounded-full border border-white/70 bg-white/90 text-[#123e46] shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => {
              const el = video.current;
              if (!el) return;
              if (el.paused) void el.play().catch(() => setPaused(true));
              else el.pause();
            }}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </>
      )}
    </div>
  );
}
