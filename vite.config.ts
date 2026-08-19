// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const SERVER_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_ID",
];

function stubDefaultCsrf(code: string) {
  const next = code.replace(
    /(?:var|const|let) defaultCsrfMiddleware = createCsrfMiddleware\([^;]+\)/,
    'var defaultCsrfMiddleware = { options: { type: "request", server: (ctx) => ctx.next() } }',
  );
  if (next === code) return;
  return { code: next, map: null };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "stub-tanstack-eager-csrf",
        enforce: "pre",
        transform(code, id) {
          const file = id.replaceAll("\\", "/");
          if (!file.includes("/@tanstack/start-server-core/")) return;
          return stubDefaultCsrf(code);
        },
        renderChunk(code) {
          return stubDefaultCsrf(code);
        },
      },
      {
        name: "supabase-server-env",
        config(_, { mode }) {
          const env = loadEnv(mode, process.cwd(), "");
          for (const key of SERVER_ENV_KEYS) {
            const value = env[key];
            if (value) process.env[key] = value;
          }
        },
      },
    ],
  },
});
