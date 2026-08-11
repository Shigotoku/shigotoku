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
        content: resolve(root, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
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
        cpSync(resolve(root, "public/icon.png"), resolve(root, "dist/icon.png"));
      },
    },
  ],
});
