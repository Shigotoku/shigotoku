import { auth, isFirebaseConfigured } from '../lib/firebase';
import {
  createInvitation,
  fetchInvitationsByCompany,
  fetchInvitationByToken,
  acceptInvitation,
  revokeInvitation,
  getProfile,
  getCompanyName,
} from '../lib/firestore';
import type { Database } from '../lib/database.types';

type InvitationRow = Database['public']['Tables']['invitations']['Row'];

function generateToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const invitationService = {
  async invite(
    companyId: string,
    email: string,
    role: 'admin' | 'member' | 'viewer',
  ): Promise<{ token: string; inviteUrl: string }> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');

    const user = auth.currentUser;
    if (!user) throw new Error('未認証');

    const existing = await fetchInvitationsByCompany(companyId);
    const duplicate = existing.find(
      (inv) => inv.email.toLowerCase() === email.toLowerCase() && !inv.accepted_at,
    );
    if (duplicate) throw new Error('このメールアドレスには既に招待を送信しています');

    const inviterProfile = await getProfile(user.uid);
    const companyName = await getCompanyName(companyId);
    const token = generateToken();

    return createInvitation({
      companyId,
      invitedBy: user.uid,
      email,
      role,
      token,
      companyName,
      inviterEmail: inviterProfile?.email ?? user.email ?? '',
    });
  },

  async fetchByCompany(companyId: string): Promise<InvitationRow[]> {
    if (!isFirebaseConfigured) return [];
    return fetchInvitationsByCompany(companyId);
  },

  async fetchByToken(token: string) {
    if (!isFirebaseConfigured) return null;
    return fetchInvitationByToken(token);
  },

  async accept(token: string): Promise<{ companyId: string; role: string }> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');

    const user = auth.currentUser;
    if (!user) throw new Error('ログインが必要です');

    return acceptInvitation(token, user.uid);
  },

  async revoke(invitationId: string, companyId?: string, token?: string): Promise<void> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    if (!companyId) throw new Error('companyId が必要です');
    await revokeInvitation(companyId, invitationId, token);
  },
};
