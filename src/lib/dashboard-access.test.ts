import { describe, expect, it } from "vitest";
import { canAccess } from "./dashboard-access";

describe("dashboard section access", () => {
  const dashboardOnly = {
    owner: false,
    permissions: { dashboard: ["view"] },
  };

  it("allows dashboard viewers to load the weekly overview widget", () => {
    expect(canAccess(dashboardOnly, "weekly")).toBe(true);
  });

  it("does not grant unrelated report sections through dashboard access", () => {
    expect(canAccess(dashboardOnly, "total")).toBe(false);
  });

  it("does not grant actions that the dashboard section does not allow", () => {
    expect(canAccess(dashboardOnly, "weekly", "print")).toBe(false);
  });
});
