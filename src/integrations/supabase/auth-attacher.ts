import { supabase } from "./client";

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = {
  options: {
    type: "function" as const,
    client: async ({ next }: { next: (opts?: { headers?: Record<string, string> }) => unknown }) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
  },
};
