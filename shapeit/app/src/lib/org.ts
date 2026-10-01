import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db, getIdToken } from "./firebase";
import { API_URL, APP_URL } from "./urls";
import type { AppRole } from "./roles";

const DEMO_FLAG = "shapeit:demo:v1";

export const LEGACY_ORG_ID = "org_shigotoku";
const ORG_KEY = "shapeit:currentOrgId";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface OrgProfile {
  id: string;
  name: string;
  billingEmail?: string;
  ownerUid?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
}

export interface OrgMember {
  uid: string;
  name: string;
  email: string;
  role: OrgRole;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  token?: string;
  invitedAt?: string;
}

export interface UserMembership {
  uid: string;
  organizationId: string;
  name: string;
  email: string;
  role: OrgRole;
  onboardingCompleted: boolean;
  orgName: string;
}

let currentOrgId: string | null = null;

export function getCurrentOrgId(): string | null {
  try {
    if (localStorage.getItem(DEMO_FLAG) === "1") return "demo";
  } catch {
    /* ignore */
  }
  if (currentOrgId) return currentOrgId;
  try {
    currentOrgId = localStorage.getItem(ORG_KEY);
  } catch {
    /* ignore */
  }
  return currentOrgId;
}

export function setCurrentOrgId(orgId: string | null) {
  currentOrgId = orgId;
  try {
    if (orgId) localStorage.setItem(ORG_KEY, orgId);
    else localStorage.removeItem(ORG_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("shapeit-org"));
}

export function mapOrgRoleToAppRole(role: string): AppRole {
  if (role === "owner" || role === "admin" || role === "member" || role === "viewer") return role;
  return "member";
}

function emailKey(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

function displayNameOf(user: User, fallback?: string) {
  return user.displayName?.trim() || fallback?.trim() || user.email?.split("@")[0] || "メンバー";
}

export async function fetchOrgProfile(orgId = getCurrentOrgId()): Promise<OrgProfile> {
  if (!orgId || orgId === "demo") {
    return { id: "demo", name: "デモ組織", onboardingCompleted: true };
  }
  const snap = await getDoc(doc(db, "shapeit_organizations", orgId));
  if (!snap.exists()) throw new Error("組織が見つかりません");
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? ""),
    billingEmail: data.billingEmail ? String(data.billingEmail) : undefined,
    ownerUid: data.ownerUid ? String(data.ownerUid) : undefined,
    onboardingCompleted: Boolean(data.onboardingCompleted),
  };
}

export async function fetchMyMemberProfile(): Promise<OrgMember> {
  const user = auth.currentUser;
  const orgId = getCurrentOrgId();
  if (!user || !orgId || orgId === "demo") {
    return {
      uid: user?.uid ?? "demo",
      name: user?.displayName || "デモユーザー",
      email: user?.email || "demo@shapeit.local",
      role: "owner",
    };
  }
  const snap = await getDoc(doc(db, "shapeit_organizations", orgId, "members", user.uid));
  if (!snap.exists()) {
    return {
      uid: user.uid,
      name: displayNameOf(user),
      email: user.email ?? "",
      role: "member",
    };
  }
  const data = snap.data();
  return {
    uid: user.uid,
    name: String(data.name ?? displayNameOf(user)),
    email: String(data.email ?? user.email ?? ""),
    role: (data.role as OrgRole) || "member",
  };
}

export async function listOrgMembers(): Promise<OrgMember[]> {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return [];
  const snap = await getDocs(collection(db, "shapeit_organizations", orgId, "members"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      name: String(data.name ?? ""),
      email: String(data.email ?? ""),
      role: (data.role as OrgRole) || "member",
    };
  });
}

export async function listOrgInvites(): Promise<OrgInvite[]> {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return [];
  const snap = await getDocs(collection(db, "shapeit_organizations", orgId, "invites"));
  return snap.docs
    .filter((d) => !d.data().acceptedAt)
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: String(data.email ?? ""),
        role: (data.role as OrgRole) || "member",
        token: data.token ? String(data.token) : undefined,
        invitedAt: data.invitedAtIso ? String(data.invitedAtIso) : undefined,
      };
    });
}

export async function updateOrgName(name: string) {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return;
  await updateDoc(doc(db, "shapeit_organizations", orgId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
  window.dispatchEvent(new Event("shapeit-org"));
}

export async function updateMyDisplayName(name: string) {
  const user = auth.currentUser;
  const orgId = getCurrentOrgId();
  if (!user) return;
  const trimmed = name.trim();
  if (orgId && orgId !== "demo") {
    await updateDoc(doc(db, "shapeit_organizations", orgId, "members", user.uid), { name: trimmed });
  }
  await setDoc(doc(db, "shapeit_users", user.uid), { name: trimmed }, { merge: true });
  window.dispatchEvent(new Event("shapeit-org"));
}

export async function removeOrgMember(uid: string) {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return;
  await deleteDoc(doc(db, "shapeit_organizations", orgId, "members", uid));
}

export async function removeOrgInvite(inviteId: string) {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return;
  const snap = await getDoc(doc(db, "shapeit_organizations", orgId, "invites", inviteId));
  const token = snap.data()?.token as string | undefined;
  await deleteDoc(doc(db, "shapeit_organizations", orgId, "invites", inviteId));
  if (token) await deleteDoc(doc(db, "shapeit_invitations", token)).catch(() => undefined);
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `API ${res.status}`);
  return body;
}

export async function inviteOrgMemberByEmail(
  email: string,
  role: OrgRole = "member",
  orgName?: string,
): Promise<{ emailSent: boolean; inviteUrl?: string }> {
  const orgId = getCurrentOrgId();
  return apiJson("/v1/org/invite", {
    method: "POST",
    body: JSON.stringify({
      email,
      role,
      orgName,
      organizationId: orgId && orgId !== "demo" ? orgId : undefined,
    }),
  });
}

export async function fetchInviteByToken(token: string): Promise<{
  email: string;
  orgName: string;
  organizationId: string;
  expired?: boolean;
} | null> {
  try {
    const snap = await getDoc(doc(db, "shapeit_invitations", token));
    if (snap.exists()) {
      const data = snap.data();
      if (data.acceptedAt) return null;
      const expiresAt = data.expiresAt?.toMillis?.() as number | undefined;
      if (expiresAt && expiresAt < Date.now()) return { email: String(data.email), orgName: String(data.orgName ?? "ShapeIt"), organizationId: String(data.organizationId), expired: true };
      return {
        email: String(data.email ?? ""),
        orgName: String(data.orgName ?? "ShapeIt"),
        organizationId: String(data.organizationId ?? ""),
      };
    }
  } catch {
    /* fall through to API */
  }
  try {
    return await apiJson(`/v1/org/invite/${encodeURIComponent(token)}`);
  } catch {
    return null;
  }
}

export async function acceptInviteByToken(token: string): Promise<string> {
  const result = await apiJson<{ organizationId: string }>("/v1/org/invite/" + encodeURIComponent(token) + "/accept", {
    method: "POST",
  });
  setCurrentOrgId(result.organizationId);
  return result.organizationId;
}

export async function createOrganization(
  user: User,
  input: { name: string; billingEmail?: string; ownerName?: string },
): Promise<UserMembership> {
  const existing = await getDoc(doc(db, "shapeit_users", user.uid));
  if (existing.exists() && existing.data()?.organizationId) {
    const orgId = String(existing.data()!.organizationId);
    setCurrentOrgId(orgId);
    const org = await fetchOrgProfile(orgId);
    return {
      uid: user.uid,
      organizationId: orgId,
      name: String(existing.data()?.name ?? displayNameOf(user, input.ownerName)),
      email: user.email ?? "",
      role: (existing.data()?.role as OrgRole) || "owner",
      onboardingCompleted: Boolean(org.onboardingCompleted),
      orgName: org.name,
    };
  }

  const orgRef = doc(collection(db, "shapeit_organizations"));
  const orgId = orgRef.id;
  const ownerName = displayNameOf(user, input.ownerName);
  const companyName = input.name.trim() || `${ownerName}の会社`;
  const billingEmail = (input.billingEmail || user.email || "").trim().toLowerCase();

  // バッチ不可: ルール評価時点では org が未作成のため members 作成が拒否される
  await setDoc(orgRef, {
    name: companyName,
    billingEmail,
    ownerUid: user.uid,
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(orgRef, "members", user.uid), {
    role: "owner",
    email: (user.email ?? "").toLowerCase(),
    name: ownerName,
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "shapeit_users", user.uid), {
    organizationId: orgId,
    name: ownerName,
    email: (user.email ?? "").toLowerCase(),
    role: "owner",
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
  setCurrentOrgId(orgId);
  return {
    uid: user.uid,
    organizationId: orgId,
    name: ownerName,
    email: user.email ?? "",
    role: "owner",
    onboardingCompleted: true,
    orgName: companyName,
  };
}

export async function completeOrganizationSetup(
  orgId: string,
  input: { name: string; billingEmail?: string },
) {
  await updateDoc(doc(db, "shapeit_organizations", orgId), {
    name: input.name.trim(),
    billingEmail: (input.billingEmail ?? "").trim().toLowerCase(),
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });
  window.dispatchEvent(new Event("shapeit-org"));
}

async function loadMembershipFromUserDoc(uid: string): Promise<UserMembership | null> {
  const snap = await getDoc(doc(db, "shapeit_users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const orgId = String(data.organizationId ?? "");
  if (!orgId) return null;
  setCurrentOrgId(orgId);
  let orgName = "";
  let onboardingCompleted = true;
  try {
    const org = await fetchOrgProfile(orgId);
    orgName = org.name;
    onboardingCompleted = Boolean(org.onboardingCompleted);
  } catch {
    /* ignore */
  }
  await setDoc(doc(db, "shapeit_users", uid), { lastLoginAt: serverTimestamp() }, { merge: true });
  return {
    uid,
    organizationId: orgId,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: (data.role as OrgRole) || "member",
    onboardingCompleted,
    orgName,
  };
}

async function backfillLegacyOrg(user: User): Promise<UserMembership | null> {
  const snap = await getDoc(doc(db, "shapeit_organizations", LEGACY_ORG_ID, "members", user.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const role = (data.role as OrgRole) || "member";
  await setDoc(
    doc(db, "shapeit_users", user.uid),
    {
      organizationId: LEGACY_ORG_ID,
      name: String(data.name ?? displayNameOf(user)),
      email: (user.email ?? "").toLowerCase(),
      role,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
  setCurrentOrgId(LEGACY_ORG_ID);
  const org = await fetchOrgProfile(LEGACY_ORG_ID).catch(() => ({ name: "ShapeIt", onboardingCompleted: true }));
  return {
    uid: user.uid,
    organizationId: LEGACY_ORG_ID,
    name: String(data.name ?? displayNameOf(user)),
    email: user.email ?? "",
    role,
    onboardingCompleted: Boolean(org.onboardingCompleted ?? true),
    orgName: org.name || "ShapeIt",
  };
}

async function acceptPendingInviteForEmail(user: User): Promise<UserMembership | null> {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  const q = query(collection(db, "shapeit_invitations"), where("email", "==", email));
  const snap = await getDocs(q);
  const open = snap.docs.find((d) => !d.data().acceptedAt);
  if (!open) return null;
  try {
    const orgId = await acceptInviteByToken(open.id);
    return loadMembershipFromUserDoc(user.uid).then((m) => m && { ...m, organizationId: orgId });
  } catch {
    return null;
  }
}

/** ログイン後: 既存所属 / 招待 / レガシー org を解決。新規 org は作らない。 */
export async function resolveMembership(user: User): Promise<UserMembership | null> {
  const fromUser = await loadMembershipFromUserDoc(user.uid);
  if (fromUser) return fromUser;
  const invited = await acceptPendingInviteForEmail(user);
  if (invited) return invited;
  return backfillLegacyOrg(user);
}

export async function beginOrgMembership(user: User): Promise<UserMembership | null> {
  return resolveMembership(user);
}

export async function ensureOrgMembership(user: User): Promise<UserMembership | null> {
  return resolveMembership(user);
}

export function inviteUrl(token: string) {
  return `${APP_URL.replace(/\/$/, "")}/invite/${token}`;
}
