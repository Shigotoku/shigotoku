export const INBOX_HANDOFF_KEY = 'buzzit:inboxHandoff';

export interface InboxHandoffPayload {
  ideaId: string;
  text: string;
  photoDataUrl?: string | null;
}

export function storeInboxHandoff(payload: InboxHandoffPayload) {
  sessionStorage.setItem(INBOX_HANDOFF_KEY, JSON.stringify(payload));
}
