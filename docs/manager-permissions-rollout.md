# Manager permissions

An active manager's grants are stored in `public.dashboard_user_permissions` under their Supabase Auth user ID. In the user-management page, check the account email, active status and list of visible sections. For «د راپورونو مطابقت», grant «لیدل» on that section. This grants both the monthly report and staff reconciliation. The application reloads permissions every 15 seconds while open and on window focus.

## Deployment

Apply the repository's permissions migration on the Supabase project identified by `supabase/config.toml`. Configure the verified owner's email in the server-side `OWNER_EMAILS` setting and verify that the corresponding Auth user has the active database super-admin row. User invitations also require server-side `SUPABASE_SERVICE_ROLE_KEY` and working Supabase invitation email settings.

Apply `20261119000000_dashboard_section_policies.sql` after creating the application's data tables. It adds section/action checks alongside existing row-ownership policies for problem visitors, tasks, fuel and generator tables. Then apply `20261123000000_harden_dashboard_table_grants.sql`; it removes unnecessary PUBLIC/anon privileges and revokes TRUNCATE, TRIGGER and REFERENCES from authenticated users. It changes privileges only and does not delete or rewrite rows. If a separately provisioned table is installed later, reapply the idempotent migrations.

Check an active manager with only reconciliation enabled, then remove that grant or disable the account and repeat the menu, direct report and cached-report checks. Only the owner can invite users or change grants. Print and export grants control the application's buttons. A viewer's browser can still print or save content already delivered to it.
