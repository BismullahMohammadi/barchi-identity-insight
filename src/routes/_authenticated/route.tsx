import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // A temporary network/identity-provider error is not proof of sign-out.
    // Keep the existing session on screen; server functions still verify JWTs.
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return;
    if (error) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) return;
      // Without a known session, do not pretend authentication succeeded.
      // Surface the error rather than silently redirecting a logged-in user.
      throw error;
    }
    throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
