/** Firebase Functions v2 にバインドする Secret Manager キー */
export const functionSecrets = [
  'GEMINI_API_KEY',
  'AYRSHARE_API_KEY',
  'SLACK_SIGNING_SECRET',
  'META_APP_ID',
  'META_APP_SECRET',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  // メール送信（Resend）を有効にする場合は Secret Manager に登録後、下記を追加:
  // 'RESEND_API_KEY',
] as const;
