import type { SupabaseClient } from "@supabase/supabase-js";
import { canAccess } from "./dashboard-access";
import { isEmailAllowed } from "./access";
import { OVERVIEW_SLUGS } from "./tabs";

export type DashboardAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "print"
  | "export";

export type DashboardContext = {
  claims: unknown;
  userId: string;
  supabase: SupabaseClient;
};

export function isOwner(claims: unknown): boolean {
  const email = (claims as { email?: unknown } | null)?.email;
  return isEmailAllowed(
    typeof email === "string" ? email : null,
    process.env["OWNER_EMAILS"],
  );
}

export async function hasDashboardPermissions(
  context: DashboardContext,
  sections: readonly string[],
  action: DashboardAction = "view",
  allowOverviewSources = false,
): Promise<boolean> {
  if (isOwner(context.claims)) return true;
  if (!context.userId || !sections.length || !action) return false;

  const { data, error } = await context.supabase
    .from("dashboard_user_permissions")
    .select("active,role,permissions")
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error || !data || data.active !== true || data.role !== "manager") {
    return false;
  }

  const perms = data.permissions;
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) {
    return false;
  }

  const access = {
    owner: false,
    permissions: perms as Record<string, string[]>,
  };
  const hasSectionAccess = sections.every((section) =>
    canAccess(access, section, action),
  );
  const hasOverviewAccess =
    allowOverviewSources &&
    sections.every((section) =>
      (OVERVIEW_SLUGS as readonly string[]).includes(section),
    ) &&
    canAccess(access, "dashboard", action);

  return hasSectionAccess || hasOverviewAccess;
}

export function hasDashboardPermission(
  context: DashboardContext,
  section: string,
  action: DashboardAction = "view",
) {
  return hasDashboardPermissions(context, [section], action);
}

export async function requireDashboardPermission(
  context: DashboardContext,
  section: string,
  action: DashboardAction = "view",
): Promise<void> {
  if (!(await hasDashboardPermission(context, section, action))) {
    throw new Error("ACCESS_DENIED");
  }
}
