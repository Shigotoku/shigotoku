/**
 * 本番ビルド時の環境変数。
 * deploy/build.mjs から各プロジェクトの build に渡されます。
 *
 * RUNWITH_APP_URL: app.runwith.shigotoku.com（本番）
 */
export const RUNWITH_APP_URL = 'https://app.runwith.shigotoku.com';
export const BUZZIT_APP_URL = 'https://app.buzzit.shigotoku.com';
export const CLIPIT_APP_URL = 'https://app.clipit.shigotoku.com';
export const CORPORATE_URL = 'https://shigotoku.com';
export const RUNWITH_LP_URL = 'https://shigotoku.com/runwith';
export const BUZZIT_LP_URL = 'https://shigotoku.com/buzzit';
export const CLIPIT_LP_URL = 'https://shigotoku.com/clipit';

/** GA4 測定 ID（未設定時は計測タグを出力しない） */
export const GA_MEASUREMENT_ID = process.env.PUBLIC_GA_MEASUREMENT_ID ?? '';

/** BuzzIt + コーポレート（shigotoku-prod） */
export const BUZZIT_FIREBASE = {
  apiKey: 'AIzaSyAMxl7Co5d5Kj52qt_Gh716Tob80f3qUTE',
  authDomain: 'shigotoku-prod.firebaseapp.com',
  projectId: 'shigotoku-prod',
  storageBucket: 'shigotoku-prod.firebasestorage.app',
  messagingSenderId: '750163975008',
  appId: '1:750163975008:web:d494d629951bfb05311c05',
};

/** ランウィズ専用（shigotoku-runwith-prod） */
export const RUNWITH_FIREBASE = {
  apiKey: 'AIzaSyBtF2OFFtr8aWFli-GPhTc7KfpxFAvSuhY',
  authDomain: 'shigotoku-runwith-prod.firebaseapp.com',
  projectId: 'shigotoku-runwith-prod',
  storageBucket: 'shigotoku-runwith-prod.firebasestorage.app',
  messagingSenderId: '117117503874',
  appId: '1:117117503874:web:58300b18c09acdbbfbe79b',
};

/** クリッピット専用（shigotoku-clipit-prod-ad9ee / meditoku.jp@gmail.com） */
export const CLIPIT_FIREBASE = {
  apiKey: 'AIzaSyApVwjoPSTnnciLZ30xm6g5xjF4T_10BvQ',
  authDomain: 'shigotoku-clipit-prod-ad9ee.firebaseapp.com',
  projectId: 'shigotoku-clipit-prod-ad9ee',
  storageBucket: 'shigotoku-clipit-prod-ad9ee.firebasestorage.app',
  messagingSenderId: '40045424162',
  appId: '1:40045424162:web:ecae24ef2b4ae6b211e47b',
};

export const projectEnv = {
  'corporate-site': {
    PUBLIC_RUNWITH_APP_URL: RUNWITH_APP_URL,
    PUBLIC_BUZZIT_APP_URL: BUZZIT_APP_URL,
    PUBLIC_CLIPIT_APP_URL: CLIPIT_APP_URL,
    PUBLIC_GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
    PUBLIC_FORMSPREE_FORM_ID: process.env.PUBLIC_FORMSPREE_FORM_ID ?? '',
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
  'clipit-landing': {
    PUBLIC_APP_URL: CLIPIT_APP_URL,
    PUBLIC_GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
  },
  'runwith-app': {
    VITE_LANDING_URL: RUNWITH_LP_URL,
    VITE_FIREBASE_API_KEY: RUNWITH_FIREBASE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: RUNWITH_FIREBASE.authDomain,
    VITE_FIREBASE_PROJECT_ID: RUNWITH_FIREBASE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: RUNWITH_FIREBASE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: RUNWITH_FIREBASE.messagingSenderId,
    VITE_FIREBASE_APP_ID: RUNWITH_FIREBASE.appId,
  },
  'buzzit-app': {
    VITE_LANDING_URL: BUZZIT_LP_URL,
    VITE_FIREBASE_API_KEY: BUZZIT_FIREBASE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: BUZZIT_FIREBASE.authDomain,
    VITE_FIREBASE_PROJECT_ID: BUZZIT_FIREBASE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: BUZZIT_FIREBASE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: BUZZIT_FIREBASE.messagingSenderId,
    VITE_FIREBASE_APP_ID: BUZZIT_FIREBASE.appId,
  },
  'clipit-app': {
    VITE_API_URL: `${CLIPIT_APP_URL}/api`,
    VITE_LANDING_URL: CLIPIT_LP_URL,
    VITE_FIREBASE_API_KEY: CLIPIT_FIREBASE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: CLIPIT_FIREBASE.authDomain,
    VITE_FIREBASE_PROJECT_ID: CLIPIT_FIREBASE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: CLIPIT_FIREBASE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: CLIPIT_FIREBASE.messagingSenderId,
    VITE_FIREBASE_APP_ID: CLIPIT_FIREBASE.appId,
  },
};
