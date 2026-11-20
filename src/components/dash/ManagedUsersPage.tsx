import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { availableActions, DASHBOARD_SECTIONS, DASHBOARD_ACTIONS } from "@/lib/dashboard-access";
import { inviteManagedUser, listManagedUsers, updateManagedUser } from '@/lib/managed-users.functions';

import { sectionLabels as names } from "@/lib/tabs";
const actions:Record<string,string> = {view:'لیدل',create:'اضافه کول',edit:'اصلاح',delete:'حذف',print:'چاپ',export:'صادرول'};
type Perms = Record<string,string[]>;
const empty = ():Perms=>({});
const viewAll=():Perms=>Object.fromEntries(DASHBOARD_SECTIONS.map(section=>[section,['view']]));
const countViews=(perms:Perms)=>DASHBOARD_SECTIONS.filter(section=>perms[section]?.includes('view')).length;
const errors:Record<string,string>={
 USER_ALREADY_MANAGED:'دا کاروونکی مخکې ثبت شوی دی. د لېست له لارې یې صلاحیتونه اصلاح کړئ.',
 INVITATION_RATE_LIMITED:'د ایمیل بلنې د لېږلو موقتي محدودیت پوره شوی؛ وروسته بیا هڅه وکړئ یا SMTP تنظیمات وګورئ.',
 INVITATION_FAILED:'Supabase بلنه ونه لېږله؛ د Authentication ایمیل تنظیمات او Logs وګورئ.',
 ADMIN_INVITES_NOT_CONFIGURED:'د سرور د بلنو تنظیمات بشپړ نه دي.',
 USER_LOOKUP_FAILED:'د Supabase حسابونو لېست ونه لوستل شو.',
 PERMISSIONS_SAVE_FAILED:'د کاروونکي صلاحیتونه ثبت نه شول؛ معلومات بدل شوي نه دي.',
 PERMISSIONS_UPDATE_FAILED:'د صلاحیتونو اصلاح ناکامه شوه.',
 ACCESS_DENIED:'یوازې عمومي مدیر دا کار کولای شي.',
};
const friendlyError=(e:unknown)=>{const message=String((e as Error)?.message??e);return Object.entries(errors).find(([code])=>message.includes(code))?.[1]??'عملیات ناکام شول. د سرور اتصال او تنظیمات وګورئ.';};
function PermissionEditor({value,onChange}:{value:Perms;onChange:(next:Perms)=>void}) {
 return <div className="space-y-2">
  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">د هرې برخې صلاحیتونه — د لیدلو اجازه: {countViews(value)} / {DASHBOARD_SECTIONS.length}</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={()=>onChange(viewAll())}>د ټولو برخو د لیدلو اجازه</Button><Button type="button" variant="outline" size="sm" onClick={()=>onChange(empty())}>ټول صلاحیتونه پاک کړئ</Button></div></div>
  <div className="overflow-x-auto rounded-xl border">
   <table className="w-full min-w-[680px] text-sm">
    <thead><tr><th className="p-3 text-right">برخه</th>{DASHBOARD_ACTIONS.map(a=><th key={a} className="p-2">{actions[a]}</th>)}</tr></thead>
    <tbody>{DASHBOARD_SECTIONS.map(section=><tr key={section} className="border-t">
      <th scope="row" className="p-3 text-right">{names[section]}</th>
      {DASHBOARD_ACTIONS.map(action=><td key={action} className="p-2 text-center"><input type="checkbox"
       aria-label={`${names[section]} — ${actions[action]}`}
       disabled={!availableActions(section).includes(action)}
       checked={availableActions(section).includes(action) && (value[section]?.includes(action)??false)}
       onChange={e=>{const current=value[section]??[];const next=e.target.checked?[...new Set([...current,action,...(action==='view'?[]:['view'])])]:action==='view'?[]:current.filter(a=>a!==action);onChange({...value,[section]:next});}}
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
 const [notice,setNotice]=useState('');
 const [filter,setFilter]=useState('');
 const invite=useMutation({mutationFn:()=>inviteManagedUser({data:{email,displayName:name,permissions}}),onSuccess:async(result)=>{setNotice(result.invitationStatus==='existing'?'دا ایمیل مخکې ثبت شوی و؛ صلاحیتونه یې فعال شول. نوی ایمیل نه دی لېږل شوی.':'د بلنې غوښتنه Supabase ومنله؛ د ایمیل رسېدل او د کاروونکي منل لا نه دي تایید شوي.');await qc.invalidateQueries({queryKey:['managed-users']});setEmail('');setName('');setPermissions(empty());setError('');},onError:e=>setError(friendlyError(e))});
 const update=useMutation({mutationFn:()=>updateManagedUser({data:{userId:editing!,displayName:name,active,permissions}}),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['managed-users']});setEditing(null);setName('');setEmail('');setPermissions(empty());setError('');setNotice('صلاحیتونه په بریالیتوب ثبت شول.');},onError:e=>setError(friendlyError(e))});
 const filteredUsers=users.data?.filter(u=>[u.email,u.display_name].some(v=>v.toLowerCase().includes(filter.trim().toLowerCase())));
 const activeManagers=users.data?.filter(u=>u.role==='manager'&&u.active).length??0;
 return <section dir="rtl" className="space-y-6">
  <div className="dashboard-page-heading"><h1 className="text-2xl font-extrabold">د کاروونکو او صلاحیتونو مدیریت</h1></div>
  {users.error && <p role="alert" className="rounded-lg border p-3 text-destructive">د کاروونکو لېست ونه لوستل شو. د مدیر حساب او د ډیټابېس د لاسرسي تنظیمات وګورئ.</p>}
  <div className="dashboard-panel p-4 sm:p-5 space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">ثبت شوي مدیران ({users.data?.length??0}) — فعال: {activeManagers}</h2><Button type="button" variant="outline" size="sm" onClick={()=>void users.refetch()} disabled={users.isFetching}>لېست تازه کړئ</Button></div>
   <input aria-label="د کاروونکو لټون" className="w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-sm" placeholder="په نوم یا ایمیل لټون…" value={filter} onChange={e=>setFilter(e.target.value)}/>
   {users.isLoading && <p>معلومات لوستل کېږي…</p>}
   {filteredUsers?.length===0&&<p className="text-sm text-muted-foreground">په دې نوم یا برېښنالیک کاروونکی ونه موندل شو.</p>}
   {filteredUsers?.map(u=><div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
    <div><p className="font-semibold">{u.display_name||u.email}</p><p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p><p className="text-xs">{u.role==='super_admin'?'عمومي مدیر':u.active?'فعال مدیر':'غیرفعال مدیر'}</p>{u.role==='manager'&&<p className="text-xs text-muted-foreground">{u.invitationStatus==='accepted'?'حساب ته ننوتلی — تایید شوی':u.invitationStatus==='pending'?'بلنه لا نه ده منل شوې':u.invitationStatus==='existing'?'مخکې ثبت شوی حساب': 'د بلنې حالت نامعلوم دی'}</p>}</div>
    {u.role==='manager' && u.active && <p className="text-xs text-muted-foreground">د لیدلو برخې: {DASHBOARD_SECTIONS.filter(key=>u.permissions?.[key]?.includes('view')).map(key=>names[key]).join('، ') || 'هېڅ'}</p>}
    {u.role==='manager'&&<Button variant="outline" onClick={()=>{setEditing(u.user_id);setEmail(u.email);setName(u.display_name);setActive(u.active);setPermissions(u.permissions??{});setError('');setNotice('');}}>صلاحیتونه بدل کړئ</Button>}
   </div>)}
  </div>
  <form className="dashboard-panel space-y-4 p-4 sm:p-5" onSubmit={e=>{e.preventDefault();setError('');setNotice('');if(countViews(permissions)===0&&!window.confirm('دې حساب ته د لیدلو هېڅ اجازه نه ده ټاکل شوې. ایا غواړئ همداسې ثبت شي؟'))return;if(editing)update.mutate();else invite.mutate();}}>
   <h2 className="font-bold">{editing?'د مدیر صلاحیتونه اصلاح کړئ':'نوي مدیر ته بلنه ورکړئ'}</h2>
   <label className="block text-sm">نوم<input className="mt-1 w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="block text-sm">ایمیل<input className="mt-1 w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2" dir="ltr" type="email" required disabled={!!editing} value={email} onChange={e=>setEmail(e.target.value)}/></label>
   {editing&&<label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> حساب فعال دی</label>}
   <PermissionEditor value={permissions} onChange={setPermissions}/>
   <p className="text-xs text-muted-foreground">د اضافه کولو، اصلاح، حذف، چاپ او صادرولو اجازه د لیدلو اجازه هم فعالوي. د لیدلو په لرې کولو سره د هماغې برخې نور صلاحیتونه هم لرې کېږي.</p>
   {notice&&<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   <div className="flex gap-2"><Button type="submit" disabled={invite.isPending||update.isPending}>{editing?'بدلونونه ثبت کړئ':'بلنه ولېږئ'}</Button>
   {editing&&<Button type="button" variant="outline" onClick={()=>{setEditing(null);setEmail('');setName('');setPermissions(empty());}}>لغوه کول</Button>}</div>
  </form>
 </section>;
}
