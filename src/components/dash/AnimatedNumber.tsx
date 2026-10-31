import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = { value:number; maximumFractionDigits?:number; className?:string };
const format=(n:number,digits:number)=>n.toLocaleString("fa-AF",{maximumFractionDigits:digits});
/** Animates only when the actual value changes; respects system reduced-motion settings. */
export function AnimatedNumber({value,maximumFractionDigits=0,className}:AnimatedNumberProps){
 const [shown,setShown]=useState(0);
 const previous=useRef<number|null>(null);
 useEffect(()=>{
  const from=previous.current;
  previous.current=value;
  if(!Number.isFinite(value) || window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   setShown(value);return;
  }
  if(from===value)return;
  let frame=0;
  const duration=650;
  const start=performance.now();
  const initial=from??0;
  const delta=value-initial;
  const tick=(now:number)=>{
   const progress=Math.min(1,(now-start)/duration);
   const eased=1-Math.pow(1-progress,3);
   setShown(initial+delta*eased);
   if(progress<1)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(frame);
 },[value]);
 return <span className={className}>{format(shown,maximumFractionDigits)}</span>;
}
