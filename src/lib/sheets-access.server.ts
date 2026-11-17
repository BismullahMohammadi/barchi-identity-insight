import { isEmailAllowed } from './access';

/** Shared owner gate; credentials are read only inside authenticated handlers. */
export function authorizedSheetHeaders(claims: unknown): Record<string, string> {
  const email = (claims as { email?: unknown } | null)?.email;
  if (!isEmailAllowed(typeof email === 'string' ? email : null, process.env['OWNER_EMAILS'])) throw new Error('ACCESS_DENIED');
  const key = process.env['LOVABLE_API_KEY'], sheets = process.env['GOOGLE_SHEETS_API_KEY'];
  if (!key || !sheets) throw new Error('SHEETS_NOT_CONNECTED');
  return { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': sheets };
}
/** Server-only Google Sheets connection credentials. Call only after endpoint RBAC checks. */
export function sheetConnectionHeaders(): Record<string, string> {
  const key = process.env['LOVABLE_API_KEY'];
  const sheets = process.env['GOOGLE_SHEETS_API_KEY'];
  if (!key || !sheets) throw new Error('SHEETS_NOT_CONNECTED');
  return { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': sheets };
}
