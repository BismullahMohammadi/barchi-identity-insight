import {createContext,useContext,useState,type ReactNode} from "react";
import {formatJ,jKey,todayJalali,type JDate} from "./jalali";

export type GlobalRange={from:JDate;to:JDate}|null;
type Value={range:GlobalRange;setRange:(value:GlobalRange)=>void};
const Context=createContext<Value|undefined>(undefined);
export function GlobalDateProvider({children}:{children:ReactNode}){
 const [range,setRange]=useState<GlobalRange>(null);
 return <Context.Provider value={{range,setRange}}>{children}</Context.Provider>;
}
export function useGlobalDateRange(){
 const ctx=useContext(Context);
 if(!ctx)throw new Error("GlobalDateProvider missing");
 return ctx;
}
export function normalizedRange(a:JDate,b:JDate):GlobalRange{
 return jKey(a)<=jKey(b)?{from:a,to:b}:{from:b,to:a};
}
export function inGlobalRange(date:JDate,range:GlobalRange):boolean{
 return !range||(jKey(date)>=jKey(range.from)&&jKey(date)<=jKey(range.to));
}
export function globalRangeLabel(range:GlobalRange):string{
 return range?`${formatJ(range.from)} — ${formatJ(range.to)}`:formatJ(todayJalali());
}
