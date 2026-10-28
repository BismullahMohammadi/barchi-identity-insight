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
 const [editingMessage,setEditingMessage]=useState(false);
 const [templateError,setTemplateError]=useState("");
 const [copyFallback,setCopyFallback]=useState("");
 const generated=buildMissingReportsWhatsapp(registration,insijam,savedTemplate);
 const [messageDraft,setMessageDraft]=useState(generated??"");
 useEffect(()=>{setMessageDraft(generated??"");setCopyFallback("");},[generated]);
 const save=()=>{
  const error=validateWhatsappTemplate(templateDraft);
  if(error){setTemplateError(error);return;}
  try{
   window.localStorage.setItem(WHATSAPP_TEMPLATE_KEY,templateDraft);
   setSavedTemplate(templateDraft);
   setTemplateError("");
   setEditingTemplate(false);
   toast.success("ټیمپلیټ خوندي شو.");
  }catch{setTemplateError("ټیمپلیټ ونه ساتل شو.");}
 };
 const copy=async()=>{
  if(!generated||!messageDraft.trim())return;
  try{
   await navigator.clipboard.writeText(messageDraft);
   setCopyFallback("");
   toast.success("پیغام کاپي شو.");
  }catch{
   setCopyFallback(messageDraft);
   toast.error("کاپي ونه شوه؛ لاندې متن کاپي کړئ.");
  }
 };
 return <section className="space-y-3 rounded-xl border bg-card p-3" aria-label="د WhatsApp پیغام">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="flex items-center gap-2 text-sm font-bold">
    <MessageCircle aria-hidden="true" className="h-5 w-5 text-primary"/>د WhatsApp پیغام
   </h3>
   <Button type="button" variant="ghost" size="sm" aria-expanded={editingTemplate} onClick={()=>{
    if(!editingTemplate){setTemplateDraft(savedTemplate);setTemplateError("");setEditingMessage(false);}
    setEditingTemplate(v=>!v);
   }}><Pencil aria-hidden="true" className="me-1 h-4 w-4"/>{editingTemplate?"بند کړئ":"ټیمپلیټ"}</Button>
  </div>

  {editingTemplate&&<div className="space-y-2 rounded-xl border bg-muted/30 p-3">
   <label htmlFor="whatsapp-template" className="text-sm font-bold">ټیمپلیټ سمول</label>
   <textarea id="whatsapp-template" dir="rtl" rows={8} maxLength={3000} value={templateDraft}
    onChange={e=>{setTemplateDraft(e.target.value);setTemplateError("");}}
    className="w-full resize-y rounded-lg border bg-background p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"/>
   <p className="text-xs text-muted-foreground"><code>{"{{date}}"}</code> · <code>{"{{names}}"}</code> — دا نښې وساتئ.</p>
   {templateError&&<p role="alert" className="text-xs text-destructive">{templateError}</p>}
   <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" onClick={save}><Save aria-hidden="true" className="me-1 h-4 w-4"/>خوندي کړئ</Button>
    <Button type="button" variant="outline" size="sm" onClick={()=>{setTemplateDraft(DEFAULT_WHATSAPP_TEMPLATE);setTemplateError("");}}>
     <RotateCcw aria-hidden="true" className="me-1 h-4 w-4"/>اصلي متن
    </Button>
   </div>
  </div>}

  {generated?<div className="space-y-2">
   <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" onClick={copy} disabled={!messageDraft.trim()}>
     <Copy aria-hidden="true" className="me-1 h-4 w-4"/>پیغام کاپي کړئ
    </Button>
    <Button type="button" variant="outline" size="sm" aria-expanded={editingMessage} onClick={()=>{
      setEditingMessage(v=>!v);setEditingTemplate(false);
    }}>{editingMessage?"متن پټ کړئ":"پیغام وګورئ / سم کړئ"}</Button>
   </div>
   {editingMessage&&<div className="space-y-2">
    <label htmlFor="whatsapp-final-message" className="sr-only">وروستی WhatsApp پیغام</label>
    <textarea id="whatsapp-final-message" dir="rtl" rows={8} value={messageDraft} onChange={e=>setMessageDraft(e.target.value)}
     className="w-full resize-y rounded-lg border bg-muted/20 p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"/>
    <Button type="button" variant="ghost" size="sm" onClick={()=>setMessageDraft(generated)}>بیا جوړول</Button>
   </div>}
   {copyFallback&&<textarea dir="rtl" readOnly aria-label="د لاسي کاپي کولو پیغام" value={copyFallback}
    onFocus={e=>e.currentTarget.select()} className="min-h-32 w-full rounded-lg border p-3 text-sm leading-7"/>}
  </div>:<p className="text-xs text-muted-foreground">پاتې راپورونه نشته.</p>}
 </section>;
}
