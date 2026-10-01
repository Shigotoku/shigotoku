/**
 * ShapeIt Chrome 拡張をビルドし zip 化。shapeit-app の downloads/ に配置。
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const extCwd = join(root, "shapeit", "extension");
const distDir = join(extCwd, "dist");
const outDir = join(deployDir, "dist", "shapeit-app", "downloads");
const zipPath = join(outDir, "shapeit-chrome-extension.zip");

function zipDirectory(srcDir, destZip) {
  try {
    unlinkSync(destZip);
  } catch {
    /* ignore */
  }
  if (platform() === "win32") {
    const psSrc = srcDir.replace(/'/g, "''");
    const psDest = destZip.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${psSrc}\\*' -DestinationPath '${psDest}' -Force"`,
      { stdio: "inherit" },
    );
    return;
  }
  execSync(`zip -r "${destZip}" .`, { cwd: srcDir, stdio: "inherit" });
}

console.log("Building shapeit-extension...\n");
execSync("npm ci", { cwd: extCwd, stdio: "inherit", shell: true });
execSync("npm run build", { cwd: extCwd, stdio: "inherit", shell: true });

const files = readdirSync(distDir);
if (!files.includes("manifest.json")) {
  throw new Error(`extension dist is incomplete: ${distDir}`);
}

mkdirSync(outDir, { recursive: true });
zipDirectory(distDir, zipPath);

const manifest = JSON.parse(readFileSync(join(distDir, "manifest.json"), "utf8"));
const versionFile = join(outDir, "extension-version.json");
writeFileSync(
  versionFile,
  JSON.stringify({ version: manifest.version, builtAt: new Date().toISOString() }, null, 2),
);

console.log(`\n✓ ${zipPath}`);
console.log(`✓ ${versionFile}`);
