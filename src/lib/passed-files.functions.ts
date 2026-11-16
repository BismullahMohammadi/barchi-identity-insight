import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readPassedFiles } from './passed-files.server';
export const getPassedFiles=createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator((input:{from:string;to:string;query?:string})=>{
  if(!/^1[34]\d{2}-\d{2}-\d{2}$/.test(input?.from??'')||!/^1[34]\d{2}-\d{2}-\d{2}$/.test(input?.to??'')||input.from>input.to)throw Error('INVALID_DATE_RANGE');
  return {from:input.from,to:input.to,query:String(input.query??'').trim().slice(0,120)};
 })
 .handler(async({data,context})=>{setResponseHeader('Cache-Control','private, no-store');return readPassedFiles(data.from,data.to,context.claims,data.query)});
