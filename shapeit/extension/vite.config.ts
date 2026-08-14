import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        background: resolve(root, "src/background.ts"),
        contentBridge: resolve(root, "src/contentBridge.ts"),
        pageReporter: resolve(root, "src/pageReporter.ts"),
        captureOverlay: resolve(root, "src/captureOverlay.ts"),
        elementPicker: resolve(root, "src/elementPicker.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        format: "es",
        manualChunks(id) {
          if (id.includes("extensionContext")) return "extensionContext";
        },
      },
    },
  },
  plugins: [
    {
      name: "copy-extension-static",
      closeBundle() {
        cpSync(resolve(root, "manifest.json"), resolve(root, "dist/manifest.json"));
        cpSync(resolve(root, "popup.html"), resolve(root, "dist/popup.html"));
        cpSync(resolve(root, "popup.js"), resolve(root, "dist/popup.js"));
        cpSync(resolve(root, "editor.html"), resolve(root, "dist/editor.html"));
        cpSync(resolve(root, "editor.css"), resolve(root, "dist/editor.css"));
        cpSync(resolve(root, "editor.js"), resolve(root, "dist/editor.js"));
        cpSync(resolve(root, "onboarding.html"), resolve(root, "dist/onboarding.html"));
        cpSync(resolve(root, "onboarding.js"), resolve(root, "dist/onboarding.js"));
        cpSync(resolve(root, "public/icon.png"), resolve(root, "dist/icon.png"));
      },
    },
  ],
});
