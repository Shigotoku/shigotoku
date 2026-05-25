import { randomUUID } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  claimDueScheduledJobs,
  updateScheduledJobStatus,
  getUserSettings,
} from './firestore';
import { executePublish } from './publish';

export async function processDueScheduledJobs(): Promise<{ processed: number; errors: number }> {
  const jobs = await claimDueScheduledJobs(20);
  let processed = 0;
  let errors = 0;

  for (const job of jobs) {
    try {
      const settings = await getUserSettings(job.uid);
      const outcome = await executePublish(
        job.uid,
        settings,
        job.publishMode,
        job.contents,
        job.scheduledAt,
        job.mediaUrls,
      );

      const finalStatus =
        outcome.status === 'published'
          ? 'published'
          : outcome.status === 'notified'
            ? 'notified'
            : 'failed';

      await updateScheduledJobStatus(job.uid, job.id, {
        status: finalStatus,
        publishResults: outcome.results,
        errorMessage: finalStatus === 'failed' ? outcome.message : undefined,
        completedMessage: outcome.message,
      });
      processed++;
    } catch (err) {
      errors++;
      await updateScheduledJobStatus(job.uid, job.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { processed, errors };
}

export async function saveOAuthState(uid: string): Promise<string> {
  const state = randomUUID();
  await getFirestore().collection('oauthStates').doc(state).set({
    uid,
    provider: 'meta',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return state;
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const ref = getFirestore().collection('oauthStates').doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if ((data.expiresAt as number) < Date.now()) {
    await ref.delete();
    return null;
  }
  const uid = data.uid as string;
  await ref.delete();
  return uid;
}
