# User-management integration checklist (not production-ready)

This branch is intentionally **not merged or deployed** until all items below pass.

1. Connect the **actual Supabase project used by Barchi Identity Insight**. The available connected Supabase account does not expose an unambiguous matching active project; never apply the migration to an unrelated Supabase project.
2. Apply `supabase/migrations/20261117000000_dashboard_user_permissions.sql` on that project and confirm the existing owner row exists. Set `OWNER_EMAILS` to the existing verified owner's email on the server. Never place service-role credentials in `VITE_*` variables.
3. Configure a server-only `SUPABASE_SERVICE_ROLE_KEY`, and confirm the project's SMTP and Auth invite redirect settings. Test inviting an ordinary manager.
4. Finish server-side RBAC for **every** report reader, reconciliation function, management mutation, PDF/print/export endpoint, and any direct Supabase data query. The current owner-only `authorizedSheetHeaders` path and other existing endpoints are NOT yet migrated. Merely hiding navigation is not authorization.
5. Ensure settings and user management routes reject direct navigation by non-owners; check actions other than `view` on the server. Ensure an active manager cannot grant self-permissions or edit their own role.
6. Run `npm run build`, `npm test`, and `npm run lint`; manually test owner, manager, disabled manager, no-permission user, and direct URL/API access. Check RLS and audit records.
7. After the above, merge the PR and deploy. Never merge an incomplete RBAC branch to production.

Current scope: invitation CRUD and permissions UI, migration, initial permission evaluator and partial Google Sheets gate. It is a **work in progress**, not a secure complete rollout.
