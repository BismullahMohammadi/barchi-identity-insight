import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { isEmailAllowed } from './access';

export const DASHBOARD_SECTIONS = [
  'dashboard','total','identity','control','services','distribution','bank',
  'arrivals','archive-scan','annual','problem-visitors','fuel-management',
  'reconciliation','center-quality','settings',
] as const;
export const DASHBOARD_ACTIONS = ['view','create','edit','delete','print','export'] as const;
const permissionsSchema = z.record(z.enum(DASHBOARD_SECTIONS), z.array(z.enum(DASHBOARD_ACTIONS))).default({});
const userInput = z.object({
  email: z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  permissions: permissionsSchema,
});
const updateInput = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(120),
  active: z.boolean(),
  permissions: permissionsSchema,
});
function normalizedPermissions(perms:Record<string,string[]>):Record<string,string[]> {
 return Object.fromEntries(Object.entries(perms).map(([section,actions])=>[
  section,actions.length && actions.some(action=>action!=='view') ? [...new Set(['view',...actions])] : actions,
 ]));
}
type UserRecord = { user_id:string;email:string;display_name:string;role:string;active:boolean;permissions:Record<string,string[]>; invitationStatus?:'accepted'|'pending'|'existing'|'unknown' };
function requireOwner(claims:unknown) {
  const email = (claims as {email?:string}|null)?.email;
  if (!isEmailAllowed(email, process.env['OWNER_EMAILS'])) throw new Error('ACCESS_DENIED');
}
function permissionDb(client:unknown) {
  // Tables are introduced by a SQL migration; generated Supabase types will be refreshed separately.
  return client as SupabaseClient;
}
function adminClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error('ADMIN_INVITES_NOT_CONFIGURED');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export const listManagedUsers = createServerFn({method:'GET'})
 .middleware([requireSupabaseAuth])
 .handler(async({context}):Promise<UserRecord[]>=>{
   requireOwner(context.claims);
   setResponseHeader('Cache-Control','private, no-store');
   const {data,error} = await permissionDb(context.supabase).from('dashboard_user_permissions').select('user_id,email,display_name,role,active,permissions').order('email');
   if(error)throw new Error('USER_DIRECTORY_UNAVAILABLE');
   const records=(data??[]) as UserRecord[];
   const admin=adminClient();
   const byId=new Map<string,{last_sign_in_at?:string|null;invited_at?:string|null}>();
   for(let page=1;page<=100;page++){
     const {data:users,error:listError}=await admin.auth.admin.listUsers({page,perPage:1000});
     if(listError)break;
     for(const user of users.users)byId.set(user.id,user);
     if(users.users.length<1000)break;
   }
   return records.map(record=>{
     const authUser=byId.get(record.user_id);
     const invitationStatus:UserRecord['invitationStatus']=!authUser?'unknown'
       :authUser.last_sign_in_at?'accepted'
       :authUser.invited_at?'pending'
       :'existing';
     return {...record,invitationStatus};
   });
 });
export const inviteManagedUser = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .validator((value:unknown)=>userInput.parse(value))
 .handler(async({context,data})=>{
   requireOwner(context.claims);
   setResponseHeader('Cache-Control','private, no-store');
   if(isEmailAllowed(data.email,process.env['OWNER_EMAILS']))throw new Error('OWNER_ACCOUNT_PROTECTED');
   const admin=adminClient();
   // Existing Google OAuth accounts must be granted access without re-inviting them.
   // Only the authenticated owner can call this endpoint.
   let existingUserId: string | null = null;
   for (let page = 1; page <= 100; page++) {
     const {data:users,error:listError}=await admin.auth.admin.listUsers({page,perPage:1000});
     if(listError)throw new Error('USER_LOOKUP_FAILED');
     const found=users.users.find(user=>user.email?.trim().toLowerCase()===data.email);
     if(found){existingUserId=found.id;break;}
     if(users.users.length<1000)break;
   }
   let userId=existingUserId;
   const invitationStatus:'existing'|'pending' = existingUserId?'existing':'pending';
   if(!userId){
     const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(data.email,{data:{display_name:data.displayName}});
     if(inviteError||!invited.user){
       const message=(inviteError?.message??'').toLowerCase();
       if(/rate limit|too many|429/.test(message))throw new Error('INVITATION_RATE_LIMITED');
       if(/already registered|already exists|already been registered/.test(message))throw new Error('ACCOUNT_ALREADY_EXISTS_RETRY');
       throw new Error('INVITATION_FAILED');
     }
     userId=invited.user.id;
   }
   const db=permissionDb(context.supabase);
   const {data:current,error:lookupError}=await db.from('dashboard_user_permissions').select('role').eq('user_id',userId).maybeSingle();
   if(lookupError)throw new Error('USER_DIRECTORY_UNAVAILABLE');
   if(current?.role==='super_admin')throw new Error('OWNER_ACCOUNT_PROTECTED');
   if(current)throw new Error('USER_ALREADY_MANAGED');
   const {error}=await db.from('dashboard_user_permissions').upsert({
     user_id:userId,email:data.email,display_name:data.displayName,
     role:'manager',active:true,permissions:normalizedPermissions(data.permissions),
   },{onConflict:'user_id'});
   // Never delete an Auth user on a permissions write failure: it may be an existing OAuth account.
   if(error)throw new Error('PERMISSIONS_SAVE_FAILED');
   return {success:true,invitationStatus};
 });
export const updateManagedUser = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .validator((value:unknown)=>updateInput.parse(value))
 .handler(async({context,data})=>{
   requireOwner(context.claims);
   setResponseHeader('Cache-Control','private, no-store');
   const db=permissionDb(context.supabase);
   const {data:target,error:lookupError}=await db.from('dashboard_user_permissions').select('role').eq('user_id',data.userId).single();
   if(lookupError||!target||target.role!=='manager')throw new Error('OWNER_ACCOUNT_PROTECTED');
   const {error}=await db.from('dashboard_user_permissions').update({
     display_name:data.displayName,active:data.active,permissions:normalizedPermissions(data.permissions),updated_at:new Date().toISOString(),
   }).eq('user_id',data.userId);
   if(error)throw new Error('PERMISSIONS_UPDATE_FAILED');
   return {success:true};
 });
