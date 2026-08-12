import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FeedbackType } from '../types';

export async function submitFeedback(
  manualId: string,
  input: { type: FeedbackType; comment?: string; stepId?: string; viewerName?: string },
) {
  await addDoc(collection(db, 'clipit_manuals', manualId, 'feedback'), {
    type: input.type,
    comment: input.comment?.trim() ?? '',
    stepId: input.stepId ?? '',
    createdBy: input.viewerName?.trim() || '匿名',
    createdAt: serverTimestamp(),
  });
}
