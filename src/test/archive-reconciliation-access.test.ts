import { afterEach, expect, it, vi } from "vitest";
import { readArchiveReconciliation } from "@/lib/archive-reconciliation.server";
import type { DashboardContext } from "@/lib/dashboard-permissions.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("checks reconciliation permission before reading either archive workbook", async () => {
  const profile = { active: true, role: "manager", permissions: { reconciliation: [] } };
  const context = {
    userId: "archive-fixture",
    claims: { email: "manager@example.org" },
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }),
        }),
      }),
    },
  } as unknown as DashboardContext;
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);

  await expect(readArchiveReconciliation({ year: 1405, month: 8 }, context)).rejects.toThrow(
    "ACCESS_DENIED",
  );
  expect(fetch).not.toHaveBeenCalled();
});
