import { apiFetch } from '../lib/api';

export async function sendShareConfirmationEmail(input: {
  manualId: string;
  shareUrl: string;
  emails?: string[];
  message?: string;
}): Promise<{ sent: boolean; recipients: number }> {
  return apiFetch(`/v1/manuals/${encodeURIComponent(input.manualId)}/share-notify`, {
    method: 'POST',
    body: JSON.stringify({
      shareUrl: input.shareUrl,
      emails: input.emails,
      message: input.message,
    }),
  });
}
