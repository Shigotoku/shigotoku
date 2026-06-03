import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClipitMember } from '../types';

export async function listOrgMembers(orgId: string): Promise<ClipitMember[]> {
  const snap = await getDocs(collection(db, 'clipit_organizations', orgId, 'members'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as ClipitMember);
}
