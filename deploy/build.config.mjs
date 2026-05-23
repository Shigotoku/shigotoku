/**
 * 本番ビルド時の環境変数。
 * deploy/build.mjs から各プロジェクトの build に渡されます。
 *
 * RUNWITH_APP_URL: app.runwith.shigotoku.com（本番）
 */
export const RUNWITH_APP_URL = 'https://app.runwith.shigotoku.com';
export const BUZZIT_APP_URL = 'https://app.buzzit.shigotoku.com';
export const CORPORATE_URL = 'https://shigotoku.com';
export const RUNWITH_LP_URL = 'https://shigotoku.com/runwith';
export const BUZZIT_LP_URL = 'https://shigotoku.com/buzzit';

export const projectEnv = {
  'corporate-site': {
    PUBLIC_RUNWITH_APP_URL: RUNWITH_APP_URL,
    PUBLIC_BUZZIT_APP_URL: BUZZIT_APP_URL,
  },
  'runwith-landing': {
    PUBLIC_APP_URL: RUNWITH_APP_URL,
  },
  'buzzit-landing': {
    PUBLIC_APP_URL: BUZZIT_APP_URL,
    PUBLIC_CORPORATE_URL: `${CORPORATE_URL}/`,
  },
  'runwith-app': {
    VITE_LANDING_URL: RUNWITH_LP_URL,
  },
  'buzzit-app': {
    VITE_LANDING_URL: BUZZIT_LP_URL,
  },
};
