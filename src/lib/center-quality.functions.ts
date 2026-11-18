import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readCenterQuality } from './center-quality.server';
export const getCenterQuality = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .validator((input:{year:number;month:number;refresh?:boolean})=>{
  if(!input||!Number.isInteger(input.year)||input.year<1300||input.year>1499||!Number.isInteger(input.month)||input.month<0||input.month>12) throw new Error('INVALID_MONTH');
  return {year:input.year,month:input.month,refresh:input.refresh===true};
 })
 .handler(async({data,context})=>{
  setResponseHeader('Cache-Control','private, no-store');
  return readCenterQuality(data.year,data.month,context.claims,context.userId,data.refresh);
 });
