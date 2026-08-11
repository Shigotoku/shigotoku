/**
 * ShapeIt アプリのみビルドし deploy/dist/shapeit-app に配置
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { projectEnv } from "../build.config.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const appCwd = join(root, "shapeit", "app");
const out = join(deployDir, "dist", "shapeit-app");
const env = projectEnv["shapeit-app"] ?? {};

console.log("Building shapeit-app with projectEnv...\n");
execSync("npm run build", {
  cwd: appCwd,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...env },
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(appCwd, "dist"), out, { recursive: true });
console.log(`\n✓ shapeit-app -> ${out}`);
