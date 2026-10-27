export const LANDING_URL =
  import.meta.env.VITE_LANDING_URL?.replace(/\/$/, "") || "https://shigotoku.com/shapeit";

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "https://app.shapeit.shigotoku.com/api";

export const APP_URL =
  typeof window !== "undefined" ? window.location.origin : "https://app.shapeit.shigotoku.com";
