export type CaptureMode = "full" | "region" | "none";

export type EditorDraft = {
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  captureMode: CaptureMode;
  sourceTabId?: number;
  sourceWindowId?: number;
  createdAt: string;
};

const SESSION_KEY = "shapeitEditorDraft";

export async function saveEditorDraft(draft: EditorDraft): Promise<void> {
  await chrome.storage.session.set({ [SESSION_KEY]: draft });
}

export async function loadEditorDraft(): Promise<EditorDraft | null> {
  const data = await chrome.storage.session.get(SESSION_KEY);
  const draft = data[SESSION_KEY];
  if (!draft || typeof draft !== "object") return null;
  return draft as EditorDraft;
}

export async function clearEditorDraft(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEY);
}
