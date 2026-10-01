export const LANDING_URL = import.meta.env.VITE_LANDING_URL ?? 'https://shigotoku.com/clipit';

export function landingPath(path: string) {
  const base = LANDING_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
