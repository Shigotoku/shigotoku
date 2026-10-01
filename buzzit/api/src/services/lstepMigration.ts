/**
 * Lステップ CSV インポート（友だち・タグ移行）
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getUserSettings } from './firestore';

function db() {
  return getFirestore();
}

function friendsCol(uid: string) {
  return db().collection(`users/${uid}/lineFriends`);
}

function tagsCol(uid: string) {
  return db().collection(`users/${uid}/lineTags`);
}

export interface LstepImportResult {
  friendsImported: number;
  tagsCreated: number;
  skipped: number;
  errors: string[];
}

/** Lステップ形式 CSV: lineUserId,displayName,tags(comma-separated) */
export async function importLstepCsv(uid: string, csvText: string): Promise<LstepImportResult> {
  await getUserSettings(uid);
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { friendsImported: 0, tagsCreated: 0, skipped: 0, errors: ['CSVが空です'] };
  }

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('line') || header.includes('userid') || header.includes('タグ');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let friendsImported = 0;
  let tagsCreated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const tagNames = new Set<string>();

  for (const line of dataLines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) {
      skipped++;
      continue;
    }
    const lineUserId = cols[0];
    const displayName = cols[1] || '友だち';
    const tagList = cols.slice(2).join(',').split(/[,;|]/).map((t) => t.trim()).filter(Boolean);

    if (!lineUserId || lineUserId.length < 10) {
      skipped++;
      continue;
    }

    try {
      const now = new Date().toISOString();
      await friendsCol(uid).doc(lineUserId).set(
        {
          lineUserId,
          displayName,
          tags: tagList,
          status: 'followed',
          followedAt: now,
          lastSeenAt: now,
          score: 1,
          source: 'lstep_import',
          updatedAt: now,
        },
        { merge: true },
      );
      friendsImported++;

      for (const tagName of tagList) {
        if (!tagName) continue;
        tagNames.add(tagName);
      }
    } catch (err) {
      errors.push(`${lineUserId}: ${err instanceof Error ? err.message : 'import failed'}`);
    }
  }

  for (const name of tagNames) {
    const existing = await tagsCol(uid).where('name', '==', name).limit(1).get();
    if (!existing.empty) continue;
    await tagsCol(uid).add({
      name,
      color: '#525252',
      ruleType: 'manual',
      friendCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    tagsCreated++;
  }

  return { friendsImported, tagsCreated, skipped, errors };
}
