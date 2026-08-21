/**
 * Browser stub for `@tanstack/start-storage-context`.
 * The real package instantiates `node:async_hooks.AsyncLocalStorage` at module
 * load, which crashes Vite's client prebundle. Client code never needs ALS —
 * isomorphic helpers already return browser implementations.
 */
export type StartHandlerType = "router" | "serverFn";

export interface StartStorageContext {
  getRouter: () => unknown;
  request: Request;
  startOptions: unknown;
  contextAfterGlobalMiddlewares: unknown;
  executedRequestMiddlewares: Set<unknown>;
  handlerType: StartHandlerType;
  requestAssets?: unknown;
}

export async function runWithStartContext<T>(
  _context: StartStorageContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  return fn();
}

export function getStartContext<TThrow extends boolean = true>(opts?: {
  throwIfNotFound?: TThrow;
}): TThrow extends false ? StartStorageContext | undefined : StartStorageContext {
  if (opts?.throwIfNotFound !== false) {
    throw new Error(
      "No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.",
    );
  }
  return undefined as TThrow extends false ? StartStorageContext | undefined : StartStorageContext;
}
