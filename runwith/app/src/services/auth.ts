import {
  auth,
  isFirebaseConfigured,
  onAuthChanged,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  sendPasswordReset,
  updateUserPassword,
  type User,
} from '../lib/firebase';
import { ensureUserProfile, getProfile, updateProfileDoc } from '../lib/firestore';
import type { Database } from '../lib/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface SignUpResult {
  needsEmailVerification: boolean;
  userId?: string;
}

function userToProfile(user: User, profile: ProfileRow | null) {
  return profile;
}

export const authService = {
  async signUp(email: string, password: string, fullName: string): Promise<SignUpResult> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');

    const user = await signUpWithEmail(email, password, fullName);
    await ensureUserProfile(user.uid, user.email ?? email, fullName);

    return {
      needsEmailVerification: !user.emailVerified,
      userId: user.uid,
    };
  },

  async signIn(email: string, password: string) {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');

    const user = await signInWithEmail(email, password);
    await ensureUserProfile(user.uid, user.email ?? email, user.displayName);
    return { user };
  },

  async signOut() {
    if (!isFirebaseConfigured) return;
    await signOutUser();
  },

  async resetPassword(email: string) {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    await sendPasswordReset(email);
  },

  async updatePassword(password: string) {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    await updateUserPassword(password);
  },

  async getSession() {
    if (!isFirebaseConfigured) return null;
    const user = auth.currentUser;
    if (!user) return null;
    return { user: { id: user.uid, email: user.email } };
  },

  async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!isFirebaseConfigured) return null;
    return getProfile(userId);
  },

  async updateProfile(
    userId: string,
    updates: { full_name?: string; avatar_url?: string },
  ): Promise<ProfileRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return updateProfileDoc(userId, updates);
  },

  onAuthStateChange(callback: (event: string, session: { user: { id: string; email?: string | null } } | null) => void) {
    if (!isFirebaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    const unsub = onAuthChanged((user) => {
      if (!user) {
        callback('SIGNED_OUT', null);
        return;
      }
      callback('SIGNED_IN', { user: { id: user.uid, email: user.email } });
    });
    return { data: { subscription: { unsubscribe: unsub } } };
  },
};
