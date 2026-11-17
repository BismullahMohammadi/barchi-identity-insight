import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DASHBOARD_SECTIONS, DASHBOARD_ACTIONS, inviteManagedUser, listManagedUsers, updateManagedUser } from '@/lib/managed-users.functions';

const names:Record<string,string> = {
 dashboard:'د مرکز کاري بهیر',total:'مجموعي راپور',identity:'تثبیت هویت',control:'کنټرول کیفیت',
 services:'خدمات',distribution:'توزیع',bank:'عواید',arrivals:'معرفي شوي', 'archive-scan':'آرشیف سکن',
 annual:'کلنی راپور','problem-visitors':'مشکلاتي مراجعین','fuel-management':'د تېلو مدیریت',
 reconciliation:'د راپورونو مطابقت','center-quality':'د مرکزونو پرتله',settings:'تنظیمات'
};
const actions:Record<string,string> = {view:'لیدل',create:'اضافه کول',edit:'اصلاح',delete:'حذف',print:'چاپ',export:'صادرول'};
type Perms = Record<string,string[]>;
const empty = ():Perms=>({});
function PermissionEditor({value,onChange}:{value:Perms;onChange:(next:Perms)=>void}) {
 return <div className="space-y-2">
  <p className="text-sm font-semibold">د هرې برخې صلاحیتونه</p>
  <div className="overflow-x-auto rounded-xl border">
   <table className="w-full min-w-[680px] text-sm">
    <thead><tr><th className="p-3 text-right">برخه</th>{DASHBOARD_ACTIONS.map(a=><th key={a} className="p-2">{actions[a]}</th>)}</tr></thead>
    <tbody>{DASHBOARD_SECTIONS.map(section=><tr key={section} className="border-t">
      <th scope="row" className="p-3 text-right">{names[section]}</th>
      {DASHBOARD_ACTIONS.map(action=><td key={action} className="p-2 text-center"><input type="checkbox"
       aria-label={`${names[section]} — ${actions[action]}`}
       checked={value[section]?.includes(action)??false}
       onChange={e=>onChange({...value,[section]:e.target.checked?[...new Set([...(value[section]??[]),action])]: (value[section]??[]).filter(a=>a!==action)})}
      /></td>)}
    </tr>)}</tbody>
   </table>
  </div>
 </div>;
}
export function ManagedUsersPage() {
 const qc=useQueryClient();
 const users=useQuery({queryKey:['managed-users'],queryFn:()=>listManagedUsers(),retry:false});
 const [email,setEmail]=useState('');
 const [name,setName]=useState('');
 const [permissions,setPermissions]=useState<Perms>(empty);
 const [editing,setEditing]=useState<string|null>(null);
 const [active,setActive]=useState(true);
 const [error,setError]=useState('');
 const invite=useMutation({mutationFn:()=>inviteManagedUser({data:{email,displayName:name,permissions}}),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['managed-users']});setEmail('');setName('');setPermissions(empty());setError('');},onError:e=>setError(String(e.message))});
 const update=useMutation({mutationFn:()=>updateManagedUser({data:{userId:editing!,displayName:name,active,permissions}}),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['managed-users']});setEditing(null);setName('');setEmail('');setPermissions(empty());setError('');},onError:e=>setError(String(e.message))});
 const selected=users.data?.find(u=>u.user_id===editing);
 return <section dir="rtl" className="space-y-6">
  <div><h1 className="text-2xl font-extrabold">د کاروونکو او صلاحیتونو مدیریت</h1><p className="text-sm text-muted-foreground">یوازې عمومي مدیر کولای شي د نورو مدیرانو حسابونه او صلاحیتونه تنظیم کړي.</p></div>
  {users.error && <p role="alert" className="rounded-lg border p-3 text-destructive">د کاروونکو لېست ترلاسه نه شو. لومړی د Supabase امنیتي Migration او د مدیر حساب تنظیم کړئ.</p>}
  <div className="rounded-xl border bg-card p-4 space-y-3">
   <h2 className="font-bold">ثبت شوي مدیران</h2>
   {users.isLoading && <p>معلومات لوستل کېږي…</p>}
   {users.data?.map(u=><div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
    <div><p className="font-semibold">{u.display_name||u.email}</p><p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p><p className="text-xs">{u.role==='super_admin'?'عمومي مدیر':u.active?'فعال مدیر':'غیرفعال مدیر'}</p></div>
    {u.role==='manager'&&<Button variant="outline" onClick={()=>{setEditing(u.user_id);setEmail(u.email);setName(u.display_name);setActive(u.active);setPermissions(u.permissions??{});setError('');}}>صلاحیتونه بدل کړئ</Button>}
   </div>)}
  </div>
  <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={e=>{e.preventDefault();setError('');if(editing)update.mutate();else invite.mutate();}}>
   <h2 className="font-bold">{editing?'د مدیر صلاحیتونه اصلاح کړئ':'نوی مدیر دعوت کړئ'}</h2>
   <label className="block text-sm">نوم<input className="mt-1 w-full rounded-lg border bg-background p-2" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="block text-sm">ایمیل<input className="mt-1 w-full rounded-lg border bg-background p-2" dir="ltr" type="email" required disabled={!!editing} value={email} onChange={e=>setEmail(e.target.value)}/></label>
   {editing&&<label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> حساب فعال دی</label>}
   <PermissionEditor value={permissions} onChange={setPermissions}/>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   <div className="flex gap-2"><Button type="submit" disabled={invite.isPending||update.isPending}>{editing?'بدلونونه ثبت کړئ':'د بلنې ایمیل واستوئ'}</Button>
   {editing&&<Button type="button" variant="outline" onClick={()=>{setEditing(null);setEmail('');setName('');setPermissions(empty());}}>لغوه کول</Button>}</div>
  </form>
  <p className="text-xs text-muted-foreground">امنیتي یادونه: د برخو د صلاحیتونو بشپړ پلي کېدل د ټولو سروري راپورونو له جلا امنیتي ارزونې وروسته فعالېږي.</p>
 </section>;
}
