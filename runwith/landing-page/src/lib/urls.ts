export const APP_URL = import.meta.env.PUBLIC_APP_URL ?? 'https://app.runwith.shigotoku.com';

export function appPath(path: string) {
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function sitePath(path: string) {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}

export function assetPath(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${normalized}`;
}
