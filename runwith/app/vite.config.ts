import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
          if (
            id.includes('/features/labor/') ||
            id.includes('/features/bank/') ||
            id.includes('/features/credit/') ||
            id.includes('/features/tax/') ||
            id.includes('/features/contracts/') ||
            id.includes('/features/notifications/')
          ) {
            return 'guides';
          }
          if (id.includes('/features/idea-tools/') || id.includes('/features/seed/')) {
            return 'idea-tools';
          }
        },
      },
    },
  },
});
