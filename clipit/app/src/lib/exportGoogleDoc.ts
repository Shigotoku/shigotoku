import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import { buildExportHtml } from './exportManual';
import type { ManualStep } from '../types';

/** アプリが作成したファイルのみ（検証要件を documents より軽くする） */
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function googleProviderWithDrive() {
  const p = new GoogleAuthProvider();
  for (const scope of DRIVE_SCOPES) {
    p.addScope(scope);
  }
  p.setCustomParameters({ prompt: 'consent select_account', access_type: 'online' });
  return p;
}

function accessTokenFromResult(result: UserCredential) {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return credential?.accessToken ?? null;
}

export async function ensureGoogleDriveAccess(user: User): Promise<string> {
  const provider = googleProviderWithDrive();
  let token: string | null = null;
  try {
    token = accessTokenFromResult(await reauthenticateWithPopup(user, provider));
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('ポップアップが閉じられました。もう一度お試しください。');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('ポップアップがブロックされています。ブラウザの設定で許可してください。');
    }
    try {
      token = accessTokenFromResult(await signInWithPopup(auth, provider));
    } catch (e2) {
      const code2 = (e2 as { code?: string }).code ?? '';
      if (code2 === 'auth/popup-closed-by-user') {
        throw new Error('ポップアップが閉じられました。Drive へのアクセス許可が必要です。');
      }
      throw new Error(
        'Google のアクセス許可が取得できませんでした。Googleアカウントでログインし、Drive へのアクセスを「許可」してください。',
      );
    }
  }
  if (!token) {
    throw new Error(
      'Google のアクセス許可が取得できませんでした。ポップアップを許可し、Drive へのアクセスを「許可」してください。',
    );
  }
  return token;
}

/** multipart/related を FormData で送信（Google ドキュメントとして変換） */
export async function exportManualToGoogleDrive(
  title: string,
  steps: ManualStep[],
  accessToken: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const html = await buildExportHtml(title, steps);
  const metadata = {
    name: `${title}（クリッピット）`,
    mimeType: 'application/vnd.google-apps.document',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', new Blob([html], { type: 'text/html; charset=UTF-8' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    webViewLink?: string;
    error?: { message?: string; errors?: { reason?: string }[] };
  };

  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText;
    const reason = data.error?.errors?.[0]?.reason ?? '';
    if (res.status === 403 || reason === 'accessNotConfigured' || msg.includes('has not been used')) {
      throw new Error(
        'Google Drive API が無効です。Firebase プロジェクト（shigotoku-clipit-prod-ad9ee）の Google Cloud Console で「Google Drive API」を有効化し、数分待ってから再試行してください。',
      );
    }
    if (msg.includes('insufficient') || msg.includes('scope')) {
      throw new Error('Drive の権限が不足しています。もう一度「Googleドキュメントに保存」を押し、すべて許可してください。');
    }
    throw new Error(msg || 'Google ドキュメントの作成に失敗しました');
  }

  const fileId = data.id!;
  const webViewLink = data.webViewLink ?? `https://docs.google.com/document/d/${fileId}/edit`;
  return { fileId, webViewLink };
}

export async function exportToGoogleDocsForCurrentUser(
  title: string,
  steps: ManualStep[],
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインしてください');
  const token = await ensureGoogleDriveAccess(user);
  const { webViewLink } = await exportManualToGoogleDrive(title, steps, token);
  return webViewLink;
}
