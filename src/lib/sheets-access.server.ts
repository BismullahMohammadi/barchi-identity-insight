import { requireDashboardPermission, type DashboardContext } from './dashboard-permissions.server';

export async function authorizedSheetHeaders(context: DashboardContext, section: string) {
  await requireDashboardPermission(context, section);
  return sheetConnectionHeaders();
}

/** Server-only Google Sheets connection credentials. Call only after endpoint RBAC checks. */
export function sheetConnectionHeaders(): Record<string, string> {
  const key = process.env['LOVABLE_API_KEY'];
  const sheets = process.env['GOOGLE_SHEETS_API_KEY'];
  if (!key || !sheets) throw new Error('SHEETS_NOT_CONNECTED');
  return { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': sheets };
}
