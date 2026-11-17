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
type UserRecord = { user_id:string;email:string;display_name:string;role:string;active:boolean;permissions:Record<string,string[]> };
function requireOwner(claims:unknown) {
  const email = (claims as {email?:string}|null)?.email;
  if (!isEmailAllowed(email, process.env['OWNER_EMAILS'])) throw new Error('ACCESS_DENIED');
}
function permissionDb(client:unknown) {
  // Tables are introduced by a SQL migration; generated Supabase types will be refreshed separately.
  return client as SupabaseClient<any>;
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
   return (data??[]) as UserRecord[];
 });
export const inviteManagedUser = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator((value:unknown)=>userInput.parse(value))
 .handler(async({context,data})=>{
   requireOwner(context.claims);
   setResponseHeader('Cache-Control','private, no-store');
   if(isEmailAllowed(data.email,process.env['OWNER_EMAILS']))throw new Error('OWNER_ACCOUNT_PROTECTED');
   const admin=adminClient();
   const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(data.email,{data:{display_name:data.displayName}});
   if(inviteError||!invited.user)throw new Error('INVITATION_FAILED');
   const {error}=await permissionDb(context.supabase).from('dashboard_user_permissions').upsert({
     user_id:invited.user.id,email:data.email,display_name:data.displayName,
     role:'manager',active:true,permissions:data.permissions,
   },{onConflict:'user_id'});
   if(error)throw new Error('INVITED_BUT_PERMISSIONS_NOT_SAVED');
   return {success:true};
 });
export const updateManagedUser = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator((value:unknown)=>updateInput.parse(value))
 .handler(async({context,data})=>{
   requireOwner(context.claims);
   setResponseHeader('Cache-Control','private, no-store');
   const db=permissionDb(context.supabase);
   const {data:target,error:lookupError}=await db.from('dashboard_user_permissions').select('role').eq('user_id',data.userId).single();
   if(lookupError||!target||target.role!=='manager')throw new Error('OWNER_ACCOUNT_PROTECTED');
   const {error}=await db.from('dashboard_user_permissions').update({
     display_name:data.displayName,active:data.active,permissions:data.permissions,updated_at:new Date().toISOString(),
   }).eq('user_id',data.userId);
   if(error)throw new Error('PERMISSIONS_UPDATE_FAILED');
   return {success:true};
 });
