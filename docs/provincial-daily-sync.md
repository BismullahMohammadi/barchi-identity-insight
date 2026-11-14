# Provincial daily reporting — implementation status

**Status: preparatory code only; NOT automatically syncing and NOT safe to enable yet.**

Source: Google Sheet `1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs`, tab `ریاست ته ګزارش`.
Destination: Google Sheet `1CQW-MelUxvRSGqbRMatozoVkrCZlhcgxluhBscsQM0Q`, tab `مرکز دشت برچی`.

The pure function `planProvincialDailySync` maps known report metrics and day columns from the two existing monthly blocks and refuses to write when required fields are blank, invalid, absent, or conflict with destination data. It returns a dry-run list of cells; it does not write anything.

## Remaining requirements before production

1. Verify the actual list of required daily metrics against the center's reporting-completeness settings. The 19 defined metrics may not all be mandatory; holiday exceptions must come from the existing holiday rules and report settings. Non-daily fields need separately approved mapping.
2. Implement authenticated server-side Sheets write with least-privilege credentials, restricted to the one destination tab. Ensure actual write scopes and permission. Use batchUpdate with exact A1 cells and read-after-write verification. Never embed secrets in client code.
3. Add durable, distributed per-day lock, last-sync fingerprint, retries, audit log, and admin-only review of conflicting human-entered values. Without these, concurrent automatic workers can overwrite edits.
4. Trigger on data changes plus an independent backend scheduled fallback (not a browser timer). Configure the actual hosting scheduler and validate it runs with the app closed.
5. Run unit tests, TypeScript checks, end-to-end tests against a **copy** of the provincial spreadsheet, then authorize production sync. Do not write test data to the live provincial workbook.

This branch is intentionally not wired to production writes to protect official reports.
