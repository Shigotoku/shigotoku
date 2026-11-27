export type WrapitDataMode = 'mock' | 'firebase';

export function getWrapitDataMode(): WrapitDataMode {
  const explicit =
    process.env.NEXT_PUBLIC_WRAPIT_DATA_MODE;
  if (explicit === 'mock' || explicit === 'firebase') return explicit;

  const hasFirebase =
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

  return hasFirebase ? 'firebase' : 'mock';
}

export function isMockDataMode(): boolean {
  return getWrapitDataMode() === 'mock';
}


