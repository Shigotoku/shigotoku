import { getFirestore } from "firebase-admin/firestore";
import { resolveOrgId } from "./invite";

const LEGACY_ORG_ID = process.env.SHAPEIT_DEFAULT_ORG_ID ?? "org_shigotoku";

export async function resolveAuthorName(
  uid: string,
  email?: string,
  preferred?: string,
): Promise<string> {
  const name = preferred?.trim();
  if (name) return name;

  const db = getFirestore();
  try {
    const orgId = await resolveOrgId(uid, email);
    const member = await db
      .collection("shapeit_organizations")
      .doc(orgId)
      .collection("members")
      .doc(uid)
      .get();
    const memberName = String(member.data()?.name ?? "").trim();
    if (memberName) return memberName;
  } catch {
    /* fall through */
  }

  const legacyMember = await db
    .collection("shapeit_organizations")
    .doc(LEGACY_ORG_ID)
    .collection("members")
    .doc(uid)
    .get();
  const legacyName = String(legacyMember.data()?.name ?? "").trim();
  if (legacyName) return legacyName;

  const userSnap = await db.collection("shapeit_users").doc(uid).get();
  const profileName = String(userSnap.data()?.displayName ?? "").trim();
  if (profileName) return profileName;

  if (email) return email;
  return uid;
}
