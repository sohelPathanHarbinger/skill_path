import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app: a web manifest, plus a service worker that caches the app's own
    // files so it opens offline. AI requests go to other sites and are never cached.
    // The service worker only runs in `npm run build` + `npm run preview` (or once deployed).
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        id: "/",
        name: "SkillPath — Adaptive Learning Coach",
        short_name: "SkillPath",
        description:
          "Finds your current level in a technical skill, then teaches it at the right pace with an AI tutor, quizzes and a personal plan.",
        lang: "en",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        categories: ["education", "productivity"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
