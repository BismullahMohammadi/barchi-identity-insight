import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readStaffReconciliation } from './staff-reconciliation.server';
export const getStaffReconciliation=createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .validator((input:{year:number;month:number})=>{
  if(!Number.isInteger(input?.year)||input.year<1300||input.year>1499||!Number.isInteger(input?.month)||input.month<1||input.month>12)throw new Error('INVALID_MONTH');
  return {year:input.year,month:input.month};
 })
 .handler(async({data,context})=>{
  setResponseHeader('Cache-Control','private, no-store');
  return readStaffReconciliation(data.year,data.month,context.claims);
 });
