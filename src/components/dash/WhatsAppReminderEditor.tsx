import {useEffect,useState} from "react";
import {Copy,MessageCircle,Pencil,RotateCcw,Save} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import type {StaffCompleteness} from "@/lib/monthly-staff-completeness";
import {DEFAULT_WHATSAPP_TEMPLATE,WHATSAPP_TEMPLATE_KEY,buildMissingReportsWhatsapp,validateWhatsappTemplate} from "@/lib/missing-reports-whatsapp";

type Props={registration:StaffCompleteness;insijam:StaffCompleteness};

function readSavedTemplate():string{
 if(typeof window==="undefined")return DEFAULT_WHATSAPP_TEMPLATE;
 try{
  const stored=window.localStorage.getItem(WHATSAPP_TEMPLATE_KEY);
  return stored&&!validateWhatsappTemplate(stored)?stored:DEFAULT_WHATSAPP_TEMPLATE;
 }catch{return DEFAULT_WHATSAPP_TEMPLATE;}
}

export function WhatsAppReminderEditor({registration,insijam}:Props){
 const [savedTemplate,setSavedTemplate]=useState(readSavedTemplate);
 const [templateDraft,setTemplateDraft]=useState(savedTemplate);
 const [editingTemplate,setEditingTemplate]=useState(false);
 const [templateError,setTemplateError]=useState("");
 const [copyFallback,setCopyFallback]=useState("");
 const generated=buildMissingReportsWhatsapp(registration,insijam,savedTemplate);
 const [messageDraft,setMessageDraft]=useState(generated??"");
 useEffect(()=>setMessageDraft(generated??""),[generated]);
 const save=()=>{
  const error=validateWhatsappTemplate(templateDraft);
  if(error){setTemplateError(error);return;}
  try{
   window.localStorage.setItem(WHATSAPP_TEMPLATE_KEY,templateDraft);
   setSavedTemplate(templateDraft);
   setTemplateError("");
   setEditingTemplate(false);
   toast.success("د WhatsApp ټیمپلیټ خوندي شو.");
  }catch{setTemplateError("ټیمپلیټ ونه ساتل شو؛ د براوزر ذخیرې اجازه وګورئ.");}
 };
 const reset=()=>{
  setTemplateDraft(DEFAULT_WHATSAPP_TEMPLATE);
  setTemplateError("");
 };
 const copy=async()=>{
  if(!generated||!messageDraft.trim())return;
  try{
   await navigator.clipboard.writeText(messageDraft);
   setCopyFallback("");
   toast.success("د WhatsApp پیغام کاپي شو.");
  }catch{
   setCopyFallback(messageDraft);
   toast.error("د کاپي اجازه نشته؛ لاندې متن په لاس کاپي کړئ.");
  }
 };
 return <section className="space-y-3 rounded-xl border bg-card p-3" aria-label="د WhatsApp پیغام او ټیمپلیټ">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="flex items-center gap-2 text-sm font-bold"><MessageCircle aria-hidden="true" className="h-5 w-5 text-primary"/>د WhatsApp پیغام</h3>
   <Button type="button" variant="outline" size="sm" onClick={()=>{
    setTemplateDraft(savedTemplate);setTemplateError("");setEditingTemplate(v=>!v);
   }} aria-expanded={editingTemplate}><Pencil aria-hidden="true" className="me-1 h-4 w-4"/>ټیمپلیټ اېډېټ کړئ</Button>
  </div>
  {editingTemplate&&<div className="space-y-2 rounded-xl border bg-muted/30 p-3">
   <label htmlFor="whatsapp-template" className="text-sm font-bold">د پیغام ثابت متن</label>
   <textarea id="whatsapp-template" dir="rtl" rows={9} value={templateDraft} maxLength={3000}
    onChange={e=>{setTemplateDraft(e.target.value);setTemplateError("");}}
    className="w-full resize-y rounded-lg border bg-background p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"/>
   <p className="text-xs leading-6 text-muted-foreground">د <code>{"{{date}}"}</code> او <code>{"{{names}}"}</code> نښې مه لرې کوئ؛ سیستم یې د راپور نېټې او د پاتې کارمندانو نومونو سره په خپله بدلوي.</p>
   {templateError&&<p role="alert" className="text-xs text-destructive">{templateError}</p>}
   <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" onClick={save}><Save aria-hidden="true" className="me-1 h-4 w-4"/>ټیمپلیټ خوندي کړئ</Button>
    <Button type="button" variant="outline" size="sm" onClick={reset}><RotateCcw aria-hidden="true" className="me-1 h-4 w-4"/>اصلي متن</Button>
    <Button type="button" variant="ghost" size="sm" onClick={()=>setEditingTemplate(false)}>بند کړئ</Button>
   </div>
  </div>}
  {generated?<div className="space-y-2">
   <label htmlFor="whatsapp-final-message" className="text-xs font-bold">وروستی پیغام — تر لېږلو مخکې یې هم بدلولای شئ</label>
   <textarea id="whatsapp-final-message" dir="rtl" rows={9} value={messageDraft} onChange={e=>setMessageDraft(e.target.value)}
    className="w-full resize-y rounded-lg border bg-muted/20 p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"/>
   <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" onClick={copy} disabled={!messageDraft.trim()}><Copy aria-hidden="true" className="me-1 h-4 w-4"/>پیغام کاپي کړئ</Button>
    <Button type="button" variant="outline" size="sm" onClick={()=>setMessageDraft(generated)}>د پیغام بیا جوړول</Button>
   </div>
   {copyFallback&&<textarea dir="rtl" readOnly aria-label="د لاسي کاپي کولو پیغام" value={copyFallback}
    onFocus={e=>e.currentTarget.select()} className="min-h-32 w-full rounded-lg border p-3 text-sm leading-7"/>}
  </div>:<p className="text-xs leading-6 text-muted-foreground">اوس د کاپي کولو لپاره تایید شوي پاتې راپورونه نشته. ټیمپلیټ بیا هم اېډېټ او خوندي کولای شئ.</p>}
  <p className="text-xs leading-6 text-muted-foreground">ټیمپلیټ په دې براوزر کې خوندي کېږي؛ په بل کمپیوټر یا براوزر کې په اتومات ډول نه انتقالېږي. پیغام یوازې تاسو کاپي او لېږئ.</p>
 </section>;
}
