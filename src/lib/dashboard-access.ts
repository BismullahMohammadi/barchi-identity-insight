import { OVERVIEW_SLUGS } from "./tabs";

export const DASHBOARD_SECTIONS = [
  "dashboard",
  "total",
  "identity",
  "control",
  "services",
  "distribution",
  "bank",
  "arrivals",
  "archive-scan",
  "annual",
  "weekly",
  "problem-visitors",
  "fuel-management",
  "reconciliation",
  "center-quality",
  "settings",
] as const;

export const DASHBOARD_ACTIONS = ["view", "create", "edit", "delete", "print", "export"] as const;

type Access = { owner: boolean; permissions: Record<string, string[]> };

export function canAccess(
  access: Access | undefined,
  section: string,
  action = "view",
): boolean {
  if (access?.owner) return true;
  const grants = access?.permissions[section];
  return Array.isArray(grants) && grants.includes("view") && grants.includes(action);
}

export function canAccessOverviewSource(access: Access | undefined, section: string, action = "view"): boolean {
  return (
    canAccess(access, section, action) ||
    ((OVERVIEW_SLUGS as readonly string[]).includes(section) &&
      canAccess(access, "dashboard", action))
  );
}

export function sectionForPage(slug: string | undefined) {
  return slug === "staff-reconciliation" ? "reconciliation" : (slug ?? "dashboard");
}

export function availableActions(section: string): readonly string[] {
  switch (section) {
    case "dashboard":
    case "problem-visitors":
      return ["view", "create", "edit", "delete"];
    case "settings":
      return ["view", "edit"];
    case "center-quality":
      return ["view"];
    case "fuel-management":
      return ["view", "create"];
    default:
      return ["view", "print", "export"];
  }
}
