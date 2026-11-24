import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readReconciliation } from './reconciliation.server';

export const getReconciliation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((input: { year: number; month: number; refresh?: boolean; headerRows?: {local?:number;province?:number} }) => {
    if (!input || !Number.isInteger(input.year) || input.year < 1300 || input.year > 1499 || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error('INVALID_REPORT_MONTH');
    for (const row of [input.headerRows?.local,input.headerRows?.province]) if (row !== undefined && (!Number.isInteger(row) || row < 1 || row > 2000)) throw new Error('INVALID_HEADER_ROW');
    return { year: input.year, month: input.month, refresh: input.refresh === true, headerRows: input.headerRows ?? {} };
  })
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    return readReconciliation(data, context);
  });