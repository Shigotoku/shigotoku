import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps } from 'firebase-admin/app';
import { processExpiryNotifications } from './services/expiryNotifications.js';

if (!getApps().length) initializeApp();

/** 毎朝9時（JST）: 賞味期限・180日未更新マニュアルを検出して通知 */
export const clipitExpiryWorker = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async () => {
    const result = await processExpiryNotifications();
    console.log('clipitExpiryWorker:', result);
  },
);
