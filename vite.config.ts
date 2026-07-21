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
        includeAssets: ["oro_favicon.ico", "icons/*.png"],
        manifest: {
          name: "Oro",
          short_name: "Oro",
          description: "Oro App",
          theme_color: "#0a0f1d",
          background_color: "#0a0f1d",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
          shortcuts: [
            {
              name: "Markets",
              short_name: "Markets",
              url: "/markets",
              icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
            },
            {
              name: "My Predictions",
              short_name: "Predictions",
              url: "/wallet",
              icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
            },
            {
              name: "Leaderboard",
              short_name: "Leaderboard",
              url: "/leaderboard",
              icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
            },
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
        devOptions: {
          enabled: true,
          type: "module",
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
          // No manualChunks — letting Vite's default splitting handle vendor
          // chunks. The previous manual split caused vendor-misc to evaluate
          // React.createContext before vendor-react was loaded → blank screen
          // (Uncaught TypeError: Cannot read properties of undefined).
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
      hmr: {
        overlay: false,
      },
    },
  };
});
