export type DeckitDataMode = 'mock' | 'firebase';

/** @deprecated use DeckitDataMode */
export type SlideDataMode = DeckitDataMode;

export function getDeckitDataMode(): DeckitDataMode {
  const explicit =
    process.env.NEXT_PUBLIC_DECKIT_DATA_MODE ?? process.env.NEXT_PUBLIC_SLIDE_DATA_MODE;
  if (explicit === 'mock' || explicit === 'firebase') return explicit;

  const hasFirebase =
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

  return hasFirebase ? 'firebase' : 'mock';
}

export function isMockDataMode(): boolean {
  return getDeckitDataMode() === 'mock';
}

/** @deprecated use getDeckitDataMode */
export const getSlideDataMode = getDeckitDataMode;
