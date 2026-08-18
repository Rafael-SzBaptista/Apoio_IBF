import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

function env(key: string) {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return "";
  const match = readFileSync(path, "utf8").match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)["']?`, "m"));
  return match?.[1]?.trim() ?? "";
}

const serverUrl = env("CAPACITOR_SERVER_URL").replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "br.igrejabatistafonte.apoio",
  appName: "Apoio",
  webDir: "native-shell",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      backgroundColor: "#f8f4eb",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#9a5a32",
    },
  },
};

if (serverUrl) {
  config.server = {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [
      serverUrl,
      "https://*.supabase.co",
      "https://*.vercel.app",
    ],
  };
}

export default config;
