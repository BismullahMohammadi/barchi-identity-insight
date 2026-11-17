import { describe, expect, it, vi, afterEach } from 'vitest';
import { hasDashboardPermission } from './dashboard-permissions.server';

afterEach(()=>vi.unstubAllEnvs());
const context=(row:unknown,error:unknown=null,email='manager@example.org')=>({
  claims:{email},
  userId:'12345678-1234-4234-8234-123456789abc',
  supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error})})})})},
} as any);
describe('server-side manager permission checks',()=>{
 it('denies missing or disabled profiles',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   expect(await hasDashboardPermission(context(null),'total')).toBe(false);
   expect(await hasDashboardPermission(context({active:false,role:'manager',permissions:{total:['view']}}),'total')).toBe(false);
 });
 it('denies wrong section or action',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   const c=context({active:true,role:'manager',permissions:{total:['view']}});
   expect(await hasDashboardPermission(c,'identity')).toBe(false);
   expect(await hasDashboardPermission(c,'total','delete')).toBe(false);
   expect(await hasDashboardPermission(c,'total','view')).toBe(true);
 });
 it('denies DB errors and untrusted role',async()=>{
   vi.stubEnv('OWNER_EMAILS','owner@example.org');
   expect(await hasDashboardPermission(context(null,{message:'database unavailable'}),'total')).toBe(false);
   expect(await hasDashboardPermission(context({active:true,role:'super_admin',permissions:{total:['view']}}),'total')).toBe(false);
 });
});
