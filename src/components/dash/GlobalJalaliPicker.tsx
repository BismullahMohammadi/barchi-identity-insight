import {useState} from "react";
import {CalendarRange,ChevronLeft,ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Popover,PopoverContent,PopoverTrigger} from "@/components/ui/popover";
import {JALALI_MONTHS,jKey,todayJalali,type JDate} from "@/lib/jalali";
import {normalizedRange,useGlobalDateRange} from "@/lib/global-date-range";

function shift(y:number,m:number,delta:number){const index=y*12+m-1+delta;return {y:Math.floor(index/12),m:((index%12)+12)%12+1};}
export function GlobalJalaliPicker(){
 const {range,setRange}=useGlobalDateRange();
 const today=todayJalali();
 const [open,setOpen]=useState(false);
 const [view,setView]=useState({y:today.y,m:today.m});
 const [start,setStart]=useState<JDate|null>(null);
 const [end,setEnd]=useState<JDate|null>(null);
 const activeFrom=start??range?.from??today;
 const activeTo=end??(start?start:range?.to??today);
 const days=view.m<=6?31:view.m===12?(new Intl.DateTimeFormat("en-US-u-ca-persian",{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"}).format(new Date(Date.UTC(view.y+621,2,20))).includes("1/1")?30:29):30;
 function select(day:number){
  const picked={...view,d:day};
  if(!start||end){setStart(picked);setEnd(null);}
  else{setEnd(picked);}
 }
 function apply(){
  if(!start)return;
  setRange(normalizedRange(start,end??start));
  setOpen(false);setStart(null);setEnd(null);
 }
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild><Button variant="outline" className="h-9 max-w-[260px] gap-1.5 rounded-xl bg-secondary/60 px-2 text-xs font-bold sm:px-3 sm:text-sm" aria-label="د هجري شمسي تاریخ موده وټاکئ"><CalendarRange className="h-4 w-4 shrink-0"/><span className="truncate">{range?`${range.from.d} ${JALALI_MONTHS[range.from.m-1]} — ${range.to.d} ${JALALI_MONTHS[range.to.m-1]}`:`${today.d} ${JALALI_MONTHS[today.m-1]} ${today.y}`}</span></Button></PopoverTrigger>
  <PopoverContent align="end" className="w-[min(94vw,350px)] space-y-3 p-4" dir="rtl">
   <div className="flex items-center justify-between gap-2"><Button size="icon" variant="ghost" aria-label="مخکینۍ میاشت" onClick={()=>setView(v=>shift(v.y,v.m,-1))}><ChevronRight className="h-4 w-4"/></Button><strong>{JALALI_MONTHS[view.m-1]} {view.y}</strong><Button size="icon" variant="ghost" aria-label="راتلونکې میاشت" onClick={()=>setView(v=>shift(v.y,v.m,1))}><ChevronLeft className="h-4 w-4"/></Button></div>
   <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{["ش","ی","د","س","چ","پ","ج"].map((x,i)=><span key={i}>{x}</span>)}</div>
   <div className="grid grid-cols-7 gap-1">{Array.from({length:days},(_,i)=>{const day={...view,d:i+1};const key=jKey(day);const a=jKey(activeFrom),b=jKey(activeTo);const selected=key===a||key===b;const between=key>=Math.min(a,b)&&key<=Math.max(a,b);return <button type="button" key={i} onClick={()=>select(i+1)} aria-pressed={selected} className={`h-9 rounded-lg text-sm transition-colors ${selected?"bg-primary font-bold text-primary-foreground":between?"bg-primary/15 text-foreground":"hover:bg-muted"}`}>{i+1}</button>;})}</div>
   <p className="text-xs text-muted-foreground">پیل: {start?`${start.y}/${start.m}/${start.d}`:"وټاکئ"} · پای: {end?`${end.y}/${end.m}/${end.d}`:"وټاکئ"}</p>
   <div className="flex gap-2"><Button className="flex-1" disabled={!start} onClick={apply}>تطبیق</Button><Button variant="outline" onClick={()=>{setRange(null);setStart(null);setEnd(null);setOpen(false);}}>نن</Button></div>
  </PopoverContent>
 </Popover>;
}
