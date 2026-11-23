import { describe, expect, it, vi, afterEach } from 'vitest';
import { hasDashboardPermission, hasDashboardPermissions, type DashboardContext } from './dashboard-permissions.server';

afterEach(()=>vi.unstubAllEnvs());
const context=(row:unknown,error:unknown=null,email='manager@example.org')=>({
  claims:{email},
  userId:'12345678-1234-4234-8234-123456789abc',
  supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error})})})})},
} as unknown as DashboardContext);
describe('server-side manager permission checks',()=>{
 it('denies missing or disabled profiles',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   expect(await hasDashboardPermission(context(null),'total')).toBe(false);
   expect(await hasDashboardPermission(context({active:false,role:'manager',permissions:{total:['view']}}),'total')).toBe(false);
 });
 it('checks all requested sheets with one manager profile read',async()=>{
   const c=context({active:true,role:'manager',permissions:{identity:['view'],total:['view']}});
   const reads=vi.spyOn(c.supabase,'from');
   expect(await hasDashboardPermissions(c,['identity','total'])).toBe(true);
   expect(reads).toHaveBeenCalledTimes(1);
   expect(await hasDashboardPermissions(c,['identity','bank'])).toBe(false);
 });
 it('denies wrong section or action',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   const c=context({active:true,role:'manager',permissions:{total:['view']}});
   expect(await hasDashboardPermission(c,'identity')).toBe(false);
   expect(await hasDashboardPermission(c,'total','delete')).toBe(false);
   expect(await hasDashboardPermission(c,'total','view')).toBe(true);
 });
 it('requires an explicit weekly grant for the dashboard trend source',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   expect(await hasDashboardPermission(context({active:true,role:'manager',permissions:{weekly:['view']}}),'weekly')).toBe(true);
   expect(await hasDashboardPermission(context({active:true,role:'manager',permissions:{dashboard:['view']}}),'weekly')).toBe(false);
 });
 it('denies DB errors and untrusted role',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   expect(await hasDashboardPermission(context(null,{message:'database unavailable'}),'total')).toBe(false);
   expect(await hasDashboardPermission(context({active:true,role:'super_admin',permissions:{total:['view']}}),'total')).toBe(false);
 });
});
