export const functionSecrets = ["GEMINI_API_KEY"] as const;

/** 招待メール用。Secret 登録後に shapeitApi の secrets に追加して再デプロイ */
export const optionalMailSecrets = ["RESEND_API_KEY"] as const;
