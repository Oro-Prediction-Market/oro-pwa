import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(async (): Promise<UserConfig> => {
  const extraPlugins: import("vite").PluginOption[] = [];
  if (process.env.HTTPS) {
    const { default: mkcert } = await import("vite-plugin-mkcert");
    extraPlugins.push(mkcert());
  }

  return {
    base: "/",
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
    plugins: [
      react(),
      tsconfigPaths(),
      ...extraPlugins,
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
        manifest: {
          name: "Oro",
          short_name: "Oro",
          description: "Oro App",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    build: {
      target: "esnext",
      minify: "terser",
      cssCodeSplit: true,
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true, passes: 2 },
        format: { comments: false },
      },
      rollupOptions: {
        treeshake: { propertyReadSideEffects: false },
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react-dom")) return "vendor-react-dom";
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-router")) return "vendor-react";
            if (id.includes("node_modules/lucide-react")) return "vendor-lucide";
            if (id.includes("node_modules/socket.io-client") || id.includes("node_modules/engine.io")) return "vendor-socket";
            if (id.includes("node_modules/")) return "vendor-misc";
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
      chunkSizeWarningLimit: 400,
    },
    publicDir: "./public",
    server: {
      host: true,
      allowedHosts: [".ngrok-free.dev", ".ngrok.io", ".trycloudflare.com", "localhost"],
      proxy: {
        "/api": { target: "http://localhost:3000", changeOrigin: true },
      },
    },
  };
});
