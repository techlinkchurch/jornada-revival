export function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return window.location.origin;
  }
  return import.meta.env.VITE_PRODUCTION_DOMAIN ?? (typeof window !== "undefined" ? window.location.origin : "");
}
