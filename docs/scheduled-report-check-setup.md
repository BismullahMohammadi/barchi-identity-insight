# د سهار ۱۰ بجو د راپورونو اتومات ارزونه / Scheduled report check

The source code and private Supabase table are prepared. **The schedule is not operational until the owner configures its secrets and grants read access.** The workflow does **not** send WhatsApp messages automatically.

## Time and behavior
- GitHub Actions: `.github/workflows/daily-report-check.yml`, cron `30 5 * * *` (05:30 UTC = **10:00 Asia/Kabul**). GitHub scheduled jobs can start a few minutes late and require the default branch to have Actions enabled.
- Reads *yesterday's* Jalali month/day in both private Google Sheets using existing verified parsers.
- Registration/distribution/post-distribution: checks every employee's activity; recorded zero is submitted.
- Insijam: excludes worksheet rows 7 and 8 and Javed Malekzada; accepts formatted AFN money amounts.
- Friday closure is treated as nonworking unless policies later change.
- Invalid/unavailable source, missing month, or Google connection failure => status `unavailable`, **never** a missing-staff accusation.
- Writes/upserts **one day row** in `public.daily_report_checks`, so re-running the job does not create duplicate rows. Stores only missing staff, not the entire monthly report.
- Logged-in authorized owner sees the latest daily status on the dashboard. On an incomplete result, an in-app toast appears once per day while the dashboard is open. A person must choose the WhatsApp group and press **Send**.

## One-time setup (required)

1. In Google Cloud Console create a project, enable **Google Sheets API**, create a **service account**, and create/download a JSON key. Never commit it to this repository.
2. Share both private spreadsheets with that service account email as **Viewer**:
   - Registration/distribution: `1Qp5mmA9dRqZ43CLMSMM5tc53rBjAxrTj_gyRp7OVoG8`
   - Insijam: `1W82u37NeQ4Og7rANME6i3jxj1aeCZhhvIj3YtmopQ2g`
3. In GitHub repository → Settings → Secrets and variables → Actions → **New repository secret**, add:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: contents of the service-account JSON key
   - `SCHEDULE_SUPABASE_URL`: the existing Barchi Lovable/Supabase project's HTTPS API URL
   - `SCHEDULE_SUPABASE_SERVICE_ROLE_KEY`: **service_role secret** for that same project (server-side only)
4. In the deployed Lovable environment, add `SCHEDULE_SUPABASE_SERVICE_ROLE_KEY` to **server-side secrets** to let the authenticated dashboard read the private status. Do **not** use a VITE_ prefix or expose it in frontend code. The existing server-side `SUPABASE_URL` and `OWNER_EMAILS` must remain configured.
5. Ensure the database has `public.daily_report_checks`, RLS enabled, and no grants to `anon` or `authenticated`. For a fresh database, apply the repository migration `20261118000000_daily_report_checks.sql`. Only service role can write/read, and the authenticated server endpoint verifies `OWNER_EMAILS` before returning data.
6. GitHub → Actions → **Check previous-day staff reports at 10 AM Kabul** → **Run workflow**. Verify the run succeeds, then log into the dashboard and check the new banner and WhatsApp button. If a Google Sheets read returns 403, share the sheet with the service account.
7. Check for one of the statuses `incomplete`, `complete`, `nonwork` or `unavailable`. Do not interpret `unavailable` as the staff failing to submit a report.

## WhatsApp transfer
When reports are missing, click **WhatsApp ته انتقال** or **WhatsApp ته**. This opens the official `https://wa.me/?text=...` share composer with the existing Pashto/Dari editable template. In WhatsApp, choose your existing group and press **Send**. This does not require WhatsApp Business, a Meta API token, or a group ID.

## Limits
- GitHub scheduling is approximate, not hard real-time.
- The dashboard notification is shown **only while the dashboard is open** (or the next time it is opened). Background mobile push, SMS and email notification are not configured.
- Existing custom WhatsApp template is stored on the browser where you edited it.
- Google Sheets service-account access and GitHub/Lovable secrets cannot be inferred or created from the source repository; their setup requires the project owner's credentials.
- If a service-account key is ever leaked, revoke it in Google Cloud and rotate the GitHub secret immediately.
