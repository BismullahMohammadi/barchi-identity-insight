/** Retrieve server-only Sheets credentials.
 * IMPORTANT: callers MUST await requireDashboardPermission() before invoking.
 * Never expose these headers to client components.
 */
export function authorizedSheetHeaders(): Record<string,string> {
 const key=process.env['LOVABLE_API_KEY'];
 const sheets=process.env['GOOGLE_SHEETS_API_KEY'];
 if(!key||!sheets)throw new Error('SHEETS_NOT_CONNECTED');
 return {Authorization:`Bearer ${key}`,'X-Connection-Api-Key':sheets};
}
