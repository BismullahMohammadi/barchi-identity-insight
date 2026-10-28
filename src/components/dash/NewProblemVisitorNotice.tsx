import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, BellOff, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { recentReferralsQuery } from "@/lib/queries";

import type { RecentReferrals } from "@/lib/recent-referrals";
type Match = NonNullable<RecentReferrals["potentialMatches"]>[number];
const SEEN_KEY = "barchi-problem-alert-seen-v1";
const SOUND_KEY = "barchi-problem-alert-sound-v1";

function readKeys(): string[] | null {
 try {
  const raw = window.sessionStorage.getItem(SEEN_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : null;
 } catch { return null; }
}
function storeKeys(keys: string[]) {
 try { window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(keys.slice(-1000))); } catch { /* optional */ }
}
function playChime() {
 try {
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audio.currentTime);
  oscillator.frequency.setValueAtTime(1046, audio.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.07, audio.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.34);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.35);
  oscillator.onended = () => { void audio.close(); };
 } catch { /* Browser may prohibit audio before a user gesture. */ }
}

/** A short, nonrepeating global notice; the full list stays on the problems page. */
export function NewProblemVisitorNotice() {
 const recent = useQuery(recentReferralsQuery(60_000));
 const [soundEnabled, setSoundEnabled] = useState(false);
 const [visible, setVisible] = useState<Match[]>([]);
 const initialized = useRef(false);
 const seen = useRef<Set<string>>(new Set());
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 useEffect(() => {
  try { setSoundEnabled(window.localStorage.getItem(SOUND_KEY) === "1"); } catch { /* optional */ }
  return () => { if(timer.current) clearTimeout(timer.current); };
 }, []);
 useEffect(() => {
  if (!recent.data) return;
  const matches = recent.data.potentialMatches ?? [];
  if (!initialized.current) {
   initialized.current = true;
   const previous = readKeys();
   if (previous === null) {
    // Existing records are the baseline; do not announce them as new arrivals.
    seen.current = new Set(matches.map(m => m.key));
    storeKeys([...seen.current]);
    return;
   }
   seen.current = new Set(previous);
  }
  const fresh = matches.filter(m => !seen.current.has(m.key));
  if (!fresh.length) return;
  for(const m of fresh) seen.current.add(m.key);
  storeKeys([...seen.current]);
  setVisible(fresh);
  if(timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => setVisible([]), 8000);
  if(soundEnabled) playChime();
 }, [recent.data, soundEnabled]);
 function toggleSound() {
  const next = !soundEnabled;
  setSoundEnabled(next);
  try { window.localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* optional */ }
  // User gesture can unlock playback; provide an audible confirmation on enable.
  if(next) playChime();
 }
 return <div className="no-print">
  {visible.length > 0 && <aside role="alert" aria-live="assertive"
    className="fixed left-3 top-20 z-50 w-[min(92vw,370px)] rounded-xl border border-amber-400 bg-card p-3 text-foreground shadow-lg">
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">د مشکلاتي مراجع احتمالي نوی تطابق ({visible.length})</p>
        <p className="mt-1 text-xs text-muted-foreground">جزئیات د مشکلاتي مراجعینو په مینو کې وګورئ. هویت باید تایید شي.</p>
        <Link to="/dashboard/$slug" params={{slug:"problem-visitors"}} onClick={()=>setVisible([])}
         className="mt-2 inline-block text-xs font-bold text-primary underline">لېست وګورئ</Link>
      </div>
      <button type="button" aria-label="خبرتیا بنده کړئ" onClick={()=>setVisible([])}
       className="rounded p-1 hover:bg-muted"><X className="h-4 w-4"/></button>
    </div>
  </aside>}
  <button type="button" onClick={toggleSound} title={soundEnabled?"د خبرتیا غږ بند کړئ":"د خبرتیا غږ فعال کړئ"}
    aria-label={soundEnabled?"د مشکلاتي مراجعینو غږ بند کړئ":"د مشکلاتي مراجعینو غږ فعال کړئ"}
    aria-pressed={soundEnabled}
    className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground shadow-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
   {soundEnabled?<Bell className="h-4 w-4"/>:<BellOff className="h-4 w-4"/>}
  </button>
 </div>;
}
