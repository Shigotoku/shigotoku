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

/** GA4 測定 ID（未設定時は計測タグを出力しない） */
export const GA_MEASUREMENT_ID = process.env.PUBLIC_GA_MEASUREMENT_ID ?? '';

export const projectEnv = {
  'corporate-site': {
    PUBLIC_RUNWITH_APP_URL: RUNWITH_APP_URL,
    PUBLIC_BUZZIT_APP_URL: BUZZIT_APP_URL,
    PUBLIC_GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
  },
  'runwith-landing': {
    PUBLIC_APP_URL: RUNWITH_APP_URL,
    PUBLIC_GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
  },
  'buzzit-landing': {
    PUBLIC_APP_URL: BUZZIT_APP_URL,
    PUBLIC_CORPORATE_URL: `${CORPORATE_URL}/`,
    PUBLIC_GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
  },
  'runwith-app': {
    VITE_LANDING_URL: RUNWITH_LP_URL,
  },
  'buzzit-app': {
    VITE_LANDING_URL: BUZZIT_LP_URL,
    VITE_FIREBASE_API_KEY: 'AIzaSyAMxl7Co5d5Kj52qt_Gh716Tob80f3qUTE',
    VITE_FIREBASE_AUTH_DOMAIN: 'shigotoku-prod.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'shigotoku-prod',
    VITE_FIREBASE_STORAGE_BUCKET: 'shigotoku-prod.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '750163975008',
    VITE_FIREBASE_APP_ID: '1:750163975008:web:d494d629951bfb05311c05',
  },
};
