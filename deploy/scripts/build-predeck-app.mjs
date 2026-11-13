/**
 * PreDeck アプリをビルドし deploy/dist/predeck-app に配置
 * 事前に PREDECK_FIREBASE_* 環境変数を設定すること（docs/PREDECK-FIREBASE-SETUP.md）
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { projectEnv, PREDECK_FIREBASE } from "../build.config.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const appCwd = join(root, "PreDeck", "app");
const out = join(deployDir, "dist", "predeck-app");

if (!PREDECK_FIREBASE.apiKey || !PREDECK_FIREBASE.appId) {
  console.warn("! PREDECK_FIREBASE_API_KEY / APP_ID が未設定です。ログイン機能なし（AI 不可）のビルドになります。");
}

execSync("npm run build", {
  cwd: appCwd,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...(projectEnv["predeck-app"] ?? {}) },
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(appCwd, "dist"), out, { recursive: true });
console.log(`\n✓ predeck-app -> ${out}`);
