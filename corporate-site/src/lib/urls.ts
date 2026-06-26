/** 推奨 URL 構成（パス型）に合わせたデフォルト値 */
export const RUNWITH_LP = import.meta.env.PUBLIC_RUNWITH_LP_URL ?? '/runwith/';
export const RUNWITH_APP = import.meta.env.PUBLIC_RUNWITH_APP_URL ?? 'https://app.runwith.shigotoku.com';
export const BUZZIT_LP = import.meta.env.PUBLIC_BUZZIT_LP_URL ?? '/buzzit/';
export const BUZZIT_APP = import.meta.env.PUBLIC_BUZZIT_APP_URL ?? 'https://app.buzzit.shigotoku.com';
export const CLIPIT_LP = import.meta.env.PUBLIC_CLIPIT_LP_URL ?? '/clipit/';
export const CLIPIT_APP = import.meta.env.PUBLIC_CLIPIT_APP_URL ?? 'https://app.clipit.shigotoku.com';

export function runwithPath(path: string) {
  const base = RUNWITH_LP.endsWith('/') ? RUNWITH_LP.slice(0, -1) : RUNWITH_LP;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function runwithAppPath(path: string) {
  return `${RUNWITH_APP}${path.startsWith('/') ? path : `/${path}`}`;
}
