import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          runtimeErrorOverlay(),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),
      build: {
        outDir: path.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true,
        minify: "terser",
        sourcemap: process.env.NODE_ENV === "development",
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ["react", "react-dom"],
              firebase: ["firebase/app", "firebase/auth"],
              ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-toast"],
              query: ["@tanstack/react-query"],
            },
          },
        },
        // Optimize for production
        target: "esnext",
        cssCodeSplit: true,
        chunkSizeWarningLimit: 1000,
      },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  define: {
    __DEV__: process.env.NODE_ENV === "development",
    // Explicitly define environment variables for the client
    "import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(process.env.VITE_FIREBASE_API_KEY || ""),
    "import.meta.env.VITE_FIREBASE_PROJECT_ID": JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || ""),
    "import.meta.env.VITE_FIREBASE_APP_ID": JSON.stringify(process.env.VITE_FIREBASE_APP_ID || ""),
  },
});
