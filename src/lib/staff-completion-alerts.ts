import {useEffect} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import {staffCompletenessQuery,insijamCompletenessQuery,stateReportQuery} from "./queries";
import {useDashboardSettings,settingsRefreshMs} from "./dashboard-settings";
let audioContext:AudioContext|null=null;
const SOUND_KEY="barchi-completeness-sound-v1";
const ALERT_PREFIX="barchi-staff-complete-alert-";
export function isReportSoundEnabled(){
 if(typeof window==="undefined")return false;
 try{return window.localStorage.getItem(SOUND_KEY)==="on";}catch{return false;}
}
function ring(){
 try{
  if(!audioContext||audioContext.state!=="running")return;
  const oscillator=audioContext.createOscillator();
  const gain=audioContext.createGain();
  oscillator.type="sine";oscillator.frequency.setValueAtTime(740,audioContext.currentTime);
  oscillator.frequency.setValueAtTime(990,audioContext.currentTime+0.12);
  gain.gain.setValueAtTime(0.0001,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.13,audioContext.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001,audioContext.currentTime+0.36);
  oscillator.connect(gain);gain.connect(audioContext.destination);
  oscillator.start();oscillator.stop(audioContext.currentTime+0.39);
 }catch{/* audio never blocks a text alert */}
}
export async function enableReportSound(){
 if(typeof window==="undefined")return false;
 try{
  audioContext??=new AudioContext();
  await audioContext.resume();
  window.localStorage.setItem(SOUND_KEY,"on");
  ring();
  return audioContext.state==="running";
 }catch{return false;}
}
export function disableReportSound(){
 try{window.localStorage.removeItem(SOUND_KEY);}catch{/* protected browser */}
}
export function useStaffCompletionMonitor(){
 const settings=useDashboardSettings();
 const enabled=settings.showReportHealth;
 const refresh=settingsRefreshMs(settings);
 const registration=useQuery({...staffCompletenessQuery(refresh),enabled});
 const insijam=useQuery({...insijamCompletenessQuery(refresh),enabled});
 const state=useQuery({...stateReportQuery(refresh),enabled});
 const first=registration.data,second=insijam.data;
 const allComplete=!!(first&&second&&first.status==="complete"&&second.status==="complete"&&first.totalCount>0&&second.totalCount>0&&first.date===second.date);
 const summary=first&&second ? {
  date:first.date,
  complete:allComplete,
  registration:first,
  insijam:second,
  stateReport:state.data??null
 }:null;
 useEffect(()=>{
  if(!summary?.complete||typeof window==="undefined")return;
  const key=ALERT_PREFIX+summary.date+"-both";
  try{if(window.localStorage.getItem(key)==="notified")return;
      window.localStorage.setItem(key,"notified");}
  catch{/* When browser storage is blocked, still allow a visible notification. */}
  toast.success("د دواړو مدیریتونو د تېرې ورځې راپورونه بشپړ شول!",{
   description:summary.date+" · د ریاست راپور د کاپي کولو لپاره وګورئ",duration:9000
  });
  if(isReportSoundEnabled())ring();
 },[summary?.complete,summary?.date]);
 return {
  data:summary,
  isLoading:registration.isLoading||insijam.isLoading||state.isLoading,
  error:registration.error||insijam.error||state.error,
  refetch:async()=>{await Promise.all([registration.refetch(),insijam.refetch(),state.refetch()]);},
 };
}
