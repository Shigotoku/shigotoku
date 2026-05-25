/** Firebase Functions v2 にバインドする Secret Manager キー */
export const functionSecrets = [
  'GEMINI_API_KEY',
  'AYRSHARE_API_KEY',
  'SLACK_SIGNING_SECRET',
] as const;

/** Meta OAuth 用（Secret Manager に登録後、functionSecrets に追加） */
export const optionalMetaSecrets = ['META_APP_ID', 'META_APP_SECRET'] as const;
