import { AuthSessionMissingError } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/route";

const { getUser, getSession } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser, getSession } },
}));

it("returns a signed-out visitor to the login page", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
  const guard = Route.options.beforeLoad!;
  await expect(guard({} as NonNullable<Parameters<typeof guard>[0]>)).rejects.toMatchObject({
    options: { to: "/" },
  });
  expect(getSession).not.toHaveBeenCalled();
});
