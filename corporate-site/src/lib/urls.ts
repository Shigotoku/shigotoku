/** 推奨 URL 構成（パス型）に合わせたデフォルト値 */
export const RUNWITH_LP = import.meta.env.PUBLIC_RUNWITH_LP_URL ?? '/runwith/';
export const RUNWITH_APP = import.meta.env.PUBLIC_RUNWITH_APP_URL ?? 'https://app.runwith.shigotoku.com';
export const BUZZIT_LP = import.meta.env.PUBLIC_BUZZIT_LP_URL ?? '/buzzit/';
export const BUZZIT_APP = import.meta.env.PUBLIC_BUZZIT_APP_URL ?? 'https://app.buzzit.shigotoku.com';
export const CLIPIT_LP = import.meta.env.PUBLIC_CLIPIT_LP_URL ?? '/clipit/';
export const CLIPIT_APP = import.meta.env.PUBLIC_CLIPIT_APP_URL ?? 'https://app.clipit.shigotoku.com';
export const SHAPEIT_LP = import.meta.env.PUBLIC_SHAPEIT_LP_URL ?? '/shapeit/';
export const SHAPEIT_APP = import.meta.env.PUBLIC_SHAPEIT_APP_URL ?? 'https://app.shapeit.shigotoku.com';
export const DECKIT_LP = import.meta.env.PUBLIC_DECKIT_LP_URL ?? '/deckit/';
export const DECKIT_APP = import.meta.env.PUBLIC_DECKIT_APP_URL ?? 'https://app.deckit.shigotoku.com';
export const RAISEIT_LP = import.meta.env.PUBLIC_RAISEIT_LP_URL ?? '/raiseit/';
export const RAISEIT_APP = import.meta.env.PUBLIC_RAISEIT_APP_URL ?? 'https://app.raiseit.shigotoku.com';

/** Formspree フォーム ID（お問い合わせメール送信用） */
export const FORMSPREE_FORM_ID = import.meta.env.PUBLIC_FORMSPREE_FORM_ID ?? '';

function appRoot(url: string) {
  return url.replace(/\/$/, '');
}

export function runwithPath(path: string) {
  const base = RUNWITH_LP.endsWith('/') ? RUNWITH_LP.slice(0, -1) : RUNWITH_LP;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function runwithAppPath(path: string) {
  return `${appRoot(RUNWITH_APP)}${path.startsWith('/') ? path : `/${path}`}`;
}

export function runwithLoginUrl() {
  return `${appRoot(RUNWITH_APP)}/login`;
}

export function buzzitLoginUrl() {
  return `${appRoot(BUZZIT_APP)}/login`;
}

export function clipitLoginUrl() {
  return `${appRoot(CLIPIT_APP)}/login`;
}

export function shapeitLoginUrl() {
  return `${appRoot(SHAPEIT_APP)}/login`;
}

export function deckitLoginUrl() {
  return `${appRoot(DECKIT_APP)}/login`;
}

/** レイジットはアプリのトップがログイン画面(招待制) */
export function raiseitLoginUrl() {
  return `${appRoot(RAISEIT_APP)}/`;
}
