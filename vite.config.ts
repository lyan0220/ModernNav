import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "ModernNav — 现代导航 | Modern Navigation",
        short_name: "ModernNav",
        description: "发现精彩网站，探索无限可能 | Discover great sites, explore without limits",
        theme_color: "#6280a3",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "favicon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // The full icon barrel is a lazy chunk only used by the admin icon
        // picker and SmartIcon name lookups — don't force it into every
        // visitor's offline precache.
        globIgnores: ["**/lucide-react-*.js"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
      output: {
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // lucide-react is deliberately left to Rolldown's default
            // chunking: the ~40 statically used icons ride the normal shared
            // chunks, while the admin icon picker's full-barrel dynamic
            // import stays a lazy async chunk (~450KB) that never loads for
            // regular visitors.
            if (id.includes("lucide-react")) {
              return undefined;
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-is/") ||
              id.includes("/scheduler/") ||
              id.includes("/prop-types/")
            ) {
              return "react-vendor";
            }
            return "vendor";
          }
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
