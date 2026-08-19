const csrfSymbol = Symbol.for("tanstack-start:csrf-middleware");

type CsrfContext = {
  request: Request;
  handlerType: string;
  next: () => Promise<unknown>;
};

/** Plain request middleware — avoids TanStack's broken `createMiddleware` export on Vercel. */
export function requestMiddleware(server: (ctx: any) => unknown | Promise<unknown>) {
  return { options: { type: "request" as const, server } };
}

/**
 * Local CSRF factory. The official helper crashes in the Nitro/Vercel bundle
 * (`createCsrfMiddleware` / `createMiddleware` is not a function).
 */
export function createCsrfMiddleware(opts: {
  filter?: (ctx: CsrfContext) => boolean | Promise<boolean>;
} = {}) {
  const middleware = requestMiddleware(async (ctx) => {
    const csrfCtx = ctx as CsrfContext;
    if (opts.filter && !(await opts.filter(csrfCtx))) return ctx.next();
    if (isCsrfRequestAllowed(csrfCtx)) return ctx.next();
    return new Response("Forbidden", { status: 403 });
  });
  Object.defineProperty(middleware, csrfSymbol, { value: true });
  return middleware;
}

function isCsrfRequestAllowed(ctx: CsrfContext): boolean {
  const fetchSite = ctx.request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null) return fetchSite === "same-origin";

  const origin = ctx.request.headers.get("Origin");
  if (origin !== null) return origin === new URL(ctx.request.url).origin;

  const referer = ctx.request.headers.get("Referer");
  if (referer === null) return false;
  return isRefererSameOrigin(referer, new URL(ctx.request.url).origin);
}

function isRefererSameOrigin(referer: string, requestOrigin: string): boolean {
  if (referer === requestOrigin) return true;
  if (!referer.startsWith(requestOrigin)) return false;
  if (referer.length === requestOrigin.length) return true;
  const code = referer.charCodeAt(requestOrigin.length);
  return code === 47 || code === 63 || code === 35;
}
