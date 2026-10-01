export const APP_VERSION = "0.2.0";

export function detectEnvironment(): string {
  if (typeof window === "undefined") return "server";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "local";
  if (host.includes("shapeit")) return "prod";
  return host || "unknown";
}
