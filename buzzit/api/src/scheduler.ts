import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps } from 'firebase-admin/app';
import { runAutoModeForAllUsers, sendStrategicNotifications } from './services/autoMode';

if (!getApps().length) initializeApp();

export const buzzitScheduler = onSchedule(
  {
    schedule: '0 7,12,20 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
  },
  async () => {
    const hour = new Date().getHours();
    let slot: 'morning' | 'noon' | 'evening' = 'morning';
    if (hour >= 11 && hour < 17) slot = 'noon';
    if (hour >= 17) slot = 'evening';

    await sendStrategicNotifications(slot);
    if (slot === 'morning') {
      await runAutoModeForAllUsers();
    }
  },
);
