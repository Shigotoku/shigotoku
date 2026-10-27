import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ReadConfirmationRow {
  id: string;
  manualId: string;
  manualTitle: string;
  viewerName: string;
  confirmedAt?: { toMillis?: () => number };
}

/** 組織内の最近の既読（ダッシュボード・チーム用） */
export async function listRecentReadConfirmations(
  orgId: string,
  max = 20,
): Promise<ReadConfirmationRow[]> {
  const manualsQ = query(
    collection(db, 'clipit_manuals'),
    where('organizationId', '==', orgId),
    limit(30),
  );
  const manualsSnap = await getDocs(manualsQ);
  const rows: ReadConfirmationRow[] = [];

  for (const m of manualsSnap.docs) {
    const title = (m.data().title as string) || '（無題）';
    const rcQ = query(
      collection(db, 'clipit_manuals', m.id, 'readConfirmations'),
      orderBy('confirmedAt', 'desc'),
      limit(5),
    );
    const rcSnap = await getDocs(rcQ);
    for (const rc of rcSnap.docs) {
      const d = rc.data();
      rows.push({
        id: rc.id,
        manualId: m.id,
        manualTitle: title,
        viewerName: (d.viewerName as string) || '匿名',
        confirmedAt: d.confirmedAt,
      });
    }
  }

  rows.sort((a, b) => (b.confirmedAt?.toMillis?.() ?? 0) - (a.confirmedAt?.toMillis?.() ?? 0));
  return rows.slice(0, max);
}

/** 公開中マニュアルで既読が0件のもの（要確認リスト） */
export async function listManualsWithoutReads(orgId: string): Promise<{ id: string; title: string }[]> {
  const manualsQ = query(
    collection(db, 'clipit_manuals'),
    where('organizationId', '==', orgId),
    where('status', '==', 'published'),
    limit(50),
  );
  const snap = await getDocs(manualsQ);
  const out: { id: string; title: string }[] = [];
  for (const m of snap.docs) {
    const readCount = (m.data().readCount as number) ?? 0;
    if (readCount === 0) {
      out.push({ id: m.id, title: (m.data().title as string) || '（無題）' });
    }
  }
  return out;
}
