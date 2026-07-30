import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps } from 'firebase-admin/app';
import { runAutoModeForAllUsers, sendStrategicNotifications } from './services/autoMode';
import { refreshTrendsForAllUsers } from './services/trends';
import { evaluateAbTestsForAllUsers } from './services/abTest';
import { processDueScheduledJobs } from './services/schedulerWorker';
import { processDueStepProgress } from './services/lineCrm';
import { sendWeeklyReportsToSlack } from './services/weeklyReport';
import { processXSeriesSchedules } from './services/xSeries';
import { functionSecrets } from './config/secrets';

if (!getApps().length) initializeApp();

export const buzzitScheduler = onSchedule(
  {
    schedule: '0 7,12,20 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
    secrets: [...functionSecrets],
  },
  async () => {
    const hour = new Date().getHours();
    let slot: 'morning' | 'noon' | 'evening' = 'morning';
    if (hour >= 11 && hour < 17) slot = 'noon';
    if (hour >= 17) slot = 'evening';

    await sendStrategicNotifications(slot);
    if (slot === 'morning') {
      await refreshTrendsForAllUsers();
      await runAutoModeForAllUsers();
    }
    if (slot === 'evening') {
      await evaluateAbTestsForAllUsers();
    }
  },
);

/** 5分ごと: Firestore 予約ジョブ＋Xシリーズ枠を処理 */
export const buzzitPublishWorker = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
    secrets: [...functionSecrets],
  },
  async () => {
    const result = await processDueScheduledJobs();
    const series = await processXSeriesSchedules();
    console.log('buzzitPublishWorker:', result, 'xSeries:', series);
  },
);

/** 5分ごと: LINE ステップ配信の due 進捗を処理 */
export const buzzitLineStepWorker = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
    secrets: [...functionSecrets],
  },
  async () => {
    const result = await processDueStepProgress();
    console.log('buzzitLineStepWorker:', result);
  },
);

/** 月曜 8:00: 週次レポートを Slack へ（振り返り→今週の一手） */
export const buzzitWeeklyReport = onSchedule(
  {
    schedule: '0 8 * * 1',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
    secrets: [...functionSecrets],
  },
  async () => {
    const sent = await sendWeeklyReportsToSlack();
    console.log('buzzitWeeklyReport sent:', sent);
  },
);
