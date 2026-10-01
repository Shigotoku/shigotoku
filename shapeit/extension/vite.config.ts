import { defineConfig } from "vite";
import { buildSync } from "esbuild";
import { resolve, dirname } from "node:path";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const CONTENT_SCRIPTS = ["contentBridge", "pageReporter", "captureOverlay", "elementPicker"] as const;

function bundleContentScripts() {
  for (const name of CONTENT_SCRIPTS) {
    buildSync({
      entryPoints: [resolve(root, `src/${name}.ts`)],
      bundle: true,
      format: "iife",
      platform: "browser",
      outfile: resolve(root, `dist/${name}.js`),
      target: "chrome109",
      logLevel: "silent",
    });
  }
}

function copyStaticAssets() {
  cpSync(resolve(root, "manifest.json"), resolve(root, "dist/manifest.json"));
  cpSync(resolve(root, "popup.html"), resolve(root, "dist/popup.html"));
  cpSync(resolve(root, "popup.js"), resolve(root, "dist/popup.js"));
  cpSync(resolve(root, "editor.html"), resolve(root, "dist/editor.html"));
  cpSync(resolve(root, "editor.css"), resolve(root, "dist/editor.css"));
  cpSync(resolve(root, "editor.js"), resolve(root, "dist/editor.js"));
  cpSync(resolve(root, "onboarding.html"), resolve(root, "dist/onboarding.html"));
  cpSync(resolve(root, "onboarding.js"), resolve(root, "dist/onboarding.js"));
  cpSync(resolve(root, "public/icon.png"), resolve(root, "dist/icon.png"));
}

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        background: resolve(root, "src/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    {
      name: "bundle-content-scripts-iife",
      closeBundle() {
        bundleContentScripts();
        copyStaticAssets();
      },
    },
  ],
});
