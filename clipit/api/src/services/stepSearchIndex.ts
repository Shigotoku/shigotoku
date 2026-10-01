import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { cosineSimilarity, embedText } from './geminiClient.js';

export function buildSearchText(parts: {
  manualTitle?: string;
  stepTitle?: string;
  instruction?: string;
  note?: string;
  manualDescription?: string;
}): string {
  return [
    parts.manualTitle,
    parts.manualDescription,
    parts.stepTitle,
    parts.instruction,
    parts.note,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);
}

export interface IndexedStepRow {
  manualId: string;
  stepId: string;
  searchText: string;
  searchEmbedding?: number[];
}

const SEMANTIC_THRESHOLD = 0.72;
const MAX_EMBED_BATCH = 40;

export async function ensureStepEmbeddings(
  rows: Array<{
    manualId: string;
    stepId: string;
    manualTitle: string;
    manualDescription: string;
    stepTitle: string;
    instruction: string;
    note: string;
    searchEmbedding?: number[];
  }>,
): Promise<Map<string, number[]>> {
  const db = getFirestore();
  const embeddingByStep = new Map<string, number[]>();
  let pending = 0;

  for (const row of rows) {
    const key = `${row.manualId}:${row.stepId}`;
    if (row.searchEmbedding?.length) {
      embeddingByStep.set(key, row.searchEmbedding);
      continue;
    }

    const searchText = buildSearchText(row);
    if (!searchText.trim()) continue;

    if (pending >= MAX_EMBED_BATCH) continue;

    try {
      const vec = await embedText(searchText);
      if (!vec.length) continue;
      embeddingByStep.set(key, vec);
      pending++;
      await db.collection('clipit_manuals').doc(row.manualId).collection('steps').doc(row.stepId).set(
        { searchText, searchEmbedding: vec, embeddingUpdatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } catch {
      /* skip */
    }
  }

  return embeddingByStep;
}

export function filterRowsBySemanticSimilarity<T extends { manualId: string; stepId: string }>(
  rows: T[],
  embeddingByStep: Map<string, number[]>,
  queryEmbedding: number[],
  threshold = SEMANTIC_THRESHOLD,
): T[] {
  if (!queryEmbedding.length) return [];
  return rows.filter((row) => {
    const vec = embeddingByStep.get(`${row.manualId}:${row.stepId}`);
    if (!vec?.length) return false;
    return cosineSimilarity(queryEmbedding, vec) >= threshold;
  });
}
