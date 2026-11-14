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

## GitHub Actions implementation (2026-11-14)

The workflow `.github/workflows/provincial-daily-sync.yml` checks the previous and current Kabul-local dates every 10 minutes. It only writes after ALL explicitly configured metrics contain valid numeric data, and skips Fridays. The script `scripts/provincial-daily-sync.mjs` uses a Google service account and the Google Sheets API. It refuses conflicting existing values and formulas, batches only mapped destination cells, and reads back for verification. GitHub Actions concurrency prevents simultaneous runs of this workflow. **Official public holidays besides Friday are not yet integrated**, and the workflow does not trigger instantaneously: there can be up to 10 minutes plus scheduler delay.

### REQUIRED operator setup (not possible through code alone)

1. Create a Google Cloud service account with Sheets API enabled. Share BOTH source and destination spreadsheets with its email, granting source read access and destination edit access. This is a powerful credential; keep it private.
2. In GitHub repository Settings > Secrets and variables > Actions, create secret `PROVINCIAL_GOOGLE_SERVICE_ACCOUNT_JSON` with the full service-account JSON. Never commit it.
3. Set repository variable `REQUIRED_REPORT_METRICS` to a comma-separated **verified** list of mandatory metric keys (e.g. `documents,quality,archive` is only an illustration, not an approved operational list). Keys: `documents,paper,age,biometric,family,demographic,revenue,quality,archive,scan,distribution,transfer,serviceDistribution,renewal,correction,serviceRevenue,marriage,divorce,death`.
4. Use Actions > Provincial daily report sync > Run workflow, review logs and validate against a COPY of the destination spreadsheet before authorizing writes to the live sheet. Set production destination only after test-copy verification.
5. Set up an alert on workflow failure and confirm the required daily fields and official-holiday behavior with center management.

**Important:** This integration will not work until credentials and required metrics are configured. It will not overwrite a non-matching existing destination value, even if the source was corrected later; conflicts require human review. It only syncs today/yesterday; older backfills are not supported yet. No audit database or admin sync status page has been added.
