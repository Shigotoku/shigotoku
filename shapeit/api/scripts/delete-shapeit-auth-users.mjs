/**
 * Firebase CLI のログイン情報で Auth ユーザーを全削除
 * 用法: node scripts/delete-shapeit-auth-users.mjs
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const PROJECT = process.env.SHAPEIT_FIREBASE_PROJECT_ID ?? "shigotoku-shapeit-prod";
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6";
const CLIENT_SECRET = "j9pI0GacOKM5gANlFoep41OLOrryv2F9f3Yzo63k";

function loadFirebaseCliAuth() {
  const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const preferred = config.activeAccounts?.["C:\\Users\\tokun\\Desktop\\shigotoku\\deploy"] ?? "meditoku.jp@gmail.com";
  const accounts = [...(config.additionalAccounts ?? []), ...(config.users ?? [])];
  const match =
    accounts.find((u) => u.user?.email === preferred) ??
    accounts.find((u) => u.user?.email === "meditoku.jp@gmail.com") ??
    accounts[0];
  if (match?.tokens?.refresh_token) return match.tokens;
  if (config.tokens?.refresh_token) return config.tokens;
  throw new Error("Firebase CLI にログインしていません。deploy で npx firebase login を実行してください。");
}

async function getAccessToken(tokens) {
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`アクセストークン取得失敗: ${body.error ?? res.status}`);
  }
  return body.access_token;
}

function exportUserIds() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const apiDir = dirname(scriptDir);
  const deployDir = join(apiDir, "..", "..", "deploy");
  const tmp = join(deployDir, ".tmp-shapeit-auth-export.json");
  execSync(`npx firebase auth:export "${tmp}" --project ${PROJECT} --format json`, {
    cwd: deployDir,
    stdio: "pipe",
  });
  const data = JSON.parse(readFileSync(tmp, "utf8"));
  return data.users ?? [];
}

async function batchDelete(accessToken, localIds) {
  if (localIds.length === 0) return;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchDelete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localIds, force: true }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`batchDelete failed (${res.status}): ${text}`);
  }
  const body = await res.json().catch(() => ({}));
  if (body.errors?.length) {
    throw new Error(`batchDelete partial failure: ${JSON.stringify(body.errors)}`);
  }
}

async function main() {
  const tokens = loadFirebaseCliAuth();
  const accessToken = await getAccessToken(tokens);
  const users = exportUserIds();
  if (users.length === 0) {
    console.log("Auth ユーザーは既に 0 件です。");
    return;
  }
  for (const u of users) {
    console.log(`  deleting: ${u.email ?? u.localId}`);
  }
  await batchDelete(
    accessToken,
    users.map((u) => u.localId),
  );
  console.log(`Deleted ${users.length} Auth user(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
