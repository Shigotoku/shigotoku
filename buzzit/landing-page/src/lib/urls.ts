export const APP_URL = import.meta.env.PUBLIC_APP_URL ?? 'https://app.buzzit.shigotoku.com';
export const CORPORATE_URL = import.meta.env.PUBLIC_CORPORATE_URL ?? 'https://shigotoku.com/';

export function appPath(path: string) {
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function assetPath(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${normalized}`;
}
