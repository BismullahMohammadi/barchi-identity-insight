import type { SupabaseClient } from '@supabase/supabase-js';
import { isEmailAllowed } from './access';

export type DashboardAction = 'view'|'create'|'edit'|'delete'|'print'|'export';
export type DashboardContext = {
  claims: unknown;
  userId: string;
  supabase: SupabaseClient;
};
export function isOwner(claims:unknown):boolean {
  const email=(claims as {email?:unknown}|null)?.email;
  return isEmailAllowed(typeof email==='string'?email:null,process.env['OWNER_EMAILS']);
}
export async function hasDashboardPermission(context:DashboardContext,section:string,action:DashboardAction='view'):Promise<boolean> {
  if(isOwner(context.claims))return true;
  if(!context.userId || !section || !action)return false;
  const {data,error}=await context.supabase.from('dashboard_user_permissions')
    .select('active,role,permissions').eq('user_id',context.userId).maybeSingle();
  if(error || !data || data.active!==true || data.role!=='manager')return false;
  const perms=data.permissions;
  if(!perms || typeof perms!=='object' || Array.isArray(perms))return false;
  const allowed=(perms as Record<string,unknown>)[section];
  return Array.isArray(allowed) && allowed.includes(action);
}
export async function requireDashboardPermission(context:DashboardContext,section:string,action:DashboardAction='view'):Promise<void> {
  if(!(await hasDashboardPermission(context,section,action)))throw new Error('ACCESS_DENIED');
}
