import {useEffect,useRef,useState} from "react";
import {Bell,ShieldAlert} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import type {RecentReferrals} from "@/lib/recent-referrals";
type Match=NonNullable<RecentReferrals["potentialMatches"]>[number];
const KEY="barchi-os-notice-seen-v1";
export function ProblemNotificationBell({matches}:{matches:Match[]}){
 const [open,setOpen]=useState(false);
 const [permission,setPermission]=useState<string>("unsupported");
 const known=useRef<Set<string>|null>(null);
 useEffect(()=>{setPermission("Notification" in window?Notification.permission:"unsupported");},[]);
 useEffect(()=>{
  if(known.current===null){
   let previous:string[]|null=null;
   try{const raw=window.localStorage.getItem(KEY);if(raw){const x:unknown=JSON.parse(raw);if(Array.isArray(x))previous=x.filter((v):v is string=>typeof v==="string");}}catch{/* Browser storage may be unavailable. */}
   known.current=new Set(previous??matches.map(m=>m.key));
   if(previous===null){try{window.localStorage.setItem(KEY,JSON.stringify([...known.current]));}catch{/* Browser storage may be unavailable. */}return;}
  }
  const fresh=matches.filter(m=>!known.current!.has(m.key));
  if(!fresh.length)return;
  fresh.forEach(m=>known.current!.add(m.key));
  try{window.localStorage.setItem(KEY,JSON.stringify([...known.current].slice(-1000)));}catch{/* Browser storage may be unavailable. */}
  if("Notification" in window&&Notification.permission==="granted"){
   try{const n=new Notification("نوی احتمالي مشکلاتي مراجع",{body:String(fresh.length)+" نوی احتمالي تطابق؛ په سیستم کې یې وګورئ.",tag:"barchi-problem-match"});n.onclick=()=>{window.focus();window.location.assign("/dashboard/problem-visitors");n.close();};}catch{/* Browser notifications may be disabled. */}
  }
 },[matches]);
 async function request(){if(!("Notification" in window))return;try{setPermission(await Notification.requestPermission());}catch{/* Browser notifications may be disabled. */}}
 const count=matches.length;
 return <div className="relative">
  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl" aria-label={"خبرتیاوې: "+count} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Bell className="h-5 w-5"/>{count>0&&<span className="absolute -end-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{count>99?"99+":count}</span>}</Button>
  {open&&<div role="dialog" aria-label="خبرتیاوې" className="absolute end-0 top-12 z-50 w-[min(88vw,320px)] rounded-2xl border bg-card p-4 shadow-xl">
   <div className="flex items-center justify-between gap-3"><b>خبرتیاوې</b><button className="text-xs text-muted-foreground" onClick={()=>setOpen(false)}>بندول</button></div>
   <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><ShieldAlert className="h-4 w-4 text-amber-600"/>{count?String(count)+" احتمالي مطابق شوي مراجعین":"نوی تطابق نشته"}</p>
   <Link to="/dashboard/$slug" params={{slug:"problem-visitors"}} className="mt-3 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground" onClick={()=>setOpen(false)}>لېست وګورئ</Link>
   <div className="mt-3 border-t pt-3 text-xs">{permission==="granted"?"د وسیلې خبرتیاوې فعالې دي (کله چې سیستم خلاص وي)":permission==="denied"?"اجازه بنده ده؛ په براوزر تنظیماتو کې یې فعاله کړئ.":permission==="unsupported"?"دا براوزر عمومي خبرتیا نه ملاتړ کوي.":<button className="rounded-lg border px-3 py-2" onClick={request}>عمومي خبرتیاوې فعالې کړئ</button>}</div>
  </div>}</div>;
}