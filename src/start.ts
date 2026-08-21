import { createStart } from "@tanstack/react-start";

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
