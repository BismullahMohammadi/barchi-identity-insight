-- Keep dashboard authorization helpers unavailable to anonymous API clients.
-- Authenticated users still need these functions for the dashboard RLS policies.
revoke all on function public.dashboard_is_super_admin() from public, anon;
grant execute on function public.dashboard_is_super_admin() to authenticated, service_role;

revoke all on function public.dashboard_has_action(text, text) from public, anon;
grant execute on function public.dashboard_has_action(text, text) to authenticated, service_role;

-- These functions are trigger-only. Existing triggers continue to invoke them;
-- direct RPC execution is not required by the application.
revoke all on function public.dashboard_audit_permission_change() from public, anon, authenticated, service_role;
revoke all on function public.dashboard_prevent_identity_change() from public, anon, authenticated, service_role;
