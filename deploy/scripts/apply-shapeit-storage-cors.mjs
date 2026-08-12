/**
 * ShapeIt Storage CORS を適用（バケット作成後に実行）
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const corsFile = join(scriptDir, "..", "storage.cors.shapeit.json");
const projectId = process.env.SHAPEIT_FIREBASE_PROJECT_ID ?? "shigotoku-shapeit-prod";
const buckets = [`gs://${projectId}.firebasestorage.app`];

for (const bucket of buckets) {
  console.log(`Applying CORS to ${bucket} ...`);
  execSync(`gcloud storage buckets update ${bucket} --cors-file="${corsFile}"`, {
    stdio: "inherit",
  });
}
console.log("Done.");
