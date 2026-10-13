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
        // The worker never serves the app itself. index.html comes from the
        // network on every load, and the hashed JS/CSS from the browser's HTTP
        // cache (nginx marks /assets/ immutable). So a deploy shows up on the
        // next load with nothing to accept, and a new worker can take over at
        // once — the version on screen never depends on which worker is live.
        //
        // What it still does: offline fallback for navigations, and caching
        // images and fonts. It used to precache index.html and every chunk,
        // which pinned the old build until a "new version" toast was tapped.
        //
        // Registration is in src/registerServiceWorker.ts, not the plugin's
        // autoUpdate client — that one reloads the page when a new worker
        // activates, which would wipe a half-typed stake.
        registerType: "autoUpdate",
        injectRegister: null,
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
          // Only the favicon and icons from includeAssets are precached; the
          // app shell and chunks are deliberately left out (see above).
          globPatterns: [],
          // The default falls back to a precached index.html, which no longer
          // exists — and a precached shell is exactly what pinned old builds.
          navigateFallback: null,
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Network first, with no timeout: a slow connection still gets
              // the current build. The cached copy is only for being offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                expiration: { maxEntries: 5 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Images cache the first time they are actually shown, rather
              // than all of them up front.
              urlPattern: /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "image-cache",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
