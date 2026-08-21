// Import from the core package, not `@tanstack/react-start`.
// The facade does `export * from '@tanstack/start-client-core'`, which Rolldown
// compiles to `__exportAll`. Combined with Start's `#tanstack-start-entry` cycle
// (this file), that helper is undefined on Vercel and SSR dies with
// `TypeError: __exportAll is not a function`.
import { createStart } from "@tanstack/start-client-core";

import { renderErrorPage } from "./lib/error-page";
import { createCsrfMiddleware, requestMiddleware } from "./lib/csrf-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = requestMiddleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
