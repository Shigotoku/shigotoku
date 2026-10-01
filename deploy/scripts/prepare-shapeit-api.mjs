import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const apiSrc = join(root, "shapeit", "api");
const apiDest = join(deployDir, "functions", "shapeit-api");

rmSync(apiDest, { recursive: true, force: true });
mkdirSync(apiDest, { recursive: true });

for (const name of ["package.json", "package-lock.json", "lib"]) {
  cpSync(join(apiSrc, name), join(apiDest, name), { recursive: true });
}

const pkgPath = join(apiDest, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.main = "lib/index.js";
pkg.engines = { node: "22" };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

execSync("npm ci --omit=dev", { cwd: apiDest, stdio: "inherit" });

console.log("✓ Prepared functions/shapeit-api for Firebase deploy");
