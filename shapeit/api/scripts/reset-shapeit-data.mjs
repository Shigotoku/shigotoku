/**
 * ShapeIt 本番の Auth + shapeit_* Firestore を初期化
 * 用法: npm run reset:data --prefix shapeit/api
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT = process.env.SHAPEIT_FIREBASE_PROJECT_ID ?? "shigotoku-shapeit-prod";

const TOP_COLLECTIONS = [
  "shapeit_users",
  "shapeit_organizations",
  "shapeit_invitations",
  "shapeit_feedback",
  "shapeit_issues",
  "shapeit_comments",
  "shapeit_notifications",
  "shapeit_changelog",
  "shapeit_fix_pack_meta",
  "shapeit_project_keys",
];

if (!getApps().length) {
  initializeApp({ projectId: PROJECT });
}

const db = getFirestore();
const auth = getAuth();

async function deleteDocumentRecursive(docRef) {
  const subcols = await docRef.listCollections();
  for (const sub of subcols) {
    const docs = await sub.listDocuments();
    for (const child of docs) {
      await deleteDocumentRecursive(child);
    }
  }
  await docRef.delete();
}

async function deleteTopCollection(name) {
  const refs = await db.collection(name).listDocuments();
  if (refs.length === 0) {
    console.log(`  (empty) ${name}`);
    return 0;
  }
  let count = 0;
  for (const ref of refs) {
    await deleteDocumentRecursive(ref);
    count += 1;
  }
  console.log(`  deleted ${count} doc(s) in ${name}`);
  return count;
}

async function deleteAllAuthUsers() {
  let deleted = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      await auth.deleteUser(user.uid);
      console.log(`  deleted auth: ${user.email ?? user.uid}`);
      deleted += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return deleted;
}

async function main() {
  console.log(`Resetting ShapeIt data on ${PROJECT}...\nFirestore:`);
  let docs = 0;
  for (const name of TOP_COLLECTIONS) {
    docs += await deleteTopCollection(name);
  }
  console.log("\nAuthentication:");
  const users = await deleteAllAuthUsers();
  console.log(`\nDone. Firestore docs removed: ${docs}, Auth users removed: ${users}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
