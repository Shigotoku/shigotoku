export const APP_URL = import.meta.env.PUBLIC_APP_URL ?? 'https://app.shapeit.shigotoku.com';

export function appPath(path: string) {
  return `${APP_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
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

export const shapeitIconPath = `${import.meta.env.BASE_URL}icon.png?v=2`;
