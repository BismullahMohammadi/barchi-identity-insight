import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readPassedFiles } from './passed-files.server';
export const getPassedFiles=createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator((input:{date:string})=>{if(!/^1[34]\d{2}-\d{2}-\d{2}$/.test(input?.date??''))throw Error('INVALID_DATE');return {date:input.date}})
 .handler(async({data,context})=>{setResponseHeader('Cache-Control','private, no-store');return readPassedFiles(data.date,context.claims)});
